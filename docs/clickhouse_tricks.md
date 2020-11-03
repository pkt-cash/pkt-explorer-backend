# ClickHouse Tricks

In the course of this project, I made the ClickHouse database do a few things that it is not
normally designed to do. I find the advantages of Materialized Views and AggregatingMergeTree
made ClickHouse a good fit for this workload but for some things, I needed to twist it a little
bit.

## Making rows updatable using ReplacingMergeTree
My first need was to have rows which were possible to update, I investigated the different
merge trees and eventually settled on using a ReplacingMergeTree and a millisecond timestamp
to version rows.

In this example, `dateMs` is the timestamp which is used for replacing rows.

```sql
CREATE TABLE txns (
  txid FixedString(64),
  size Int32,
  version Int32,
  locktime UInt32,
  inputCount Int32,
  outputCount Int32,
  value Int64,
  coinbase String,
  firstSeen DateTime('UTC'),
  dateMs UInt64
)
ENGINE ReplacingMergeTree(dateMs)
ORDER BY txid
```

## Getting only the most recent row
When you may conceivably be updating rows, you need to filter out the potential duplicates
in your queries, I have found 4 main ways to do this:

1. Using the [FINAL](https://clickhouse.yandex/docs/en/query_language/select/#select-from-final)
modifier
  * I did not do significant testing of the `FINAL` modifier as it was told to me that this
  is quite slow, however it should be compared to the other options in order to determine what
  is the best in different use cases.
* Using the [argMax()](https://clickhouse.yandex/docs/en/query_language/agg_functions/reference/#agg_function-argMax)
with the `dateMs` (version) field as the `val` parameter.
  * This method turned out to perform quite well when only a few columns were needed and I put
  this to use in the project.
* Using [ORDER BY](https://clickhouse.yandex/docs/en/query_language/select/#select-order-by) and
[LIMIT 1 BY](https://clickhouse.yandex/docs/en/query_language/select/#limit-by-clause) clauses
to get only the most recent versions.
  * This method turned out to be slower than `argMax()` but was still quite reasonable for use
  cases where I was selecting entire rows with `SELECT *`, I made use of this as well.
* Deduplicating externally in the application
  * In cases where the amount of duplicated data is unlikely to be very large, it can be an
  appropriate solution to absolve ClickHouse entirely from the task of deduplicating. This is
  used in the project as well.


### Using argMax()
Here we're using `argMax()` to get only the most recent hash for a given height. This table
`int_mainChain` is subject to update when chain forks resolve.

```sql
SELECT
    argMax(hash, dateMs) AS hash,
    height
  FROM int_mainChain
  WHERE height >= 500 AND height <= 1000
  GROUP BY height
```

### Using LIMIT 1 BY
In this case, we want to select all of the fields, so it would be awkward to use `argMax()`
on every one of them. The ordering key is `(mintTxid, mintIndex)` so we order by
`mintTxid`, `mintIndex`, `dateMs` in *decending* order and then we `LIMIT 1` for each
`(mintTxid, mintIndex)`. I found that putting `(mintTxid, mintIndex)` in parenthecies made
this significantly slower because I imagine it is creating tuple objects in order to sort.

```sql
SELECT
    *,
    toString(mintBlockHash)  AS mintBlockHash,
    toString(spentTxid)      AS spentTxid,
    toString(spentBlockHash) AS spentBlockHash
  FROM (
    SELECT
        *
      FROM coins
      WHERE ${whereClause}
      ORDER BY mintTxid, mintIndex, dateMs DESC
      LIMIT 1 BY mintTxid, mintIndex
  )
  ORDER BY value DESC
```

### Deduplicating in the application
In theory, use of deduplication in the app allows ClickHouse to use a far more optimized strategy,
but performance of this against the other options has not yet been tested. Here again we are seeking
greatest `dateMs` for a given `(mintTxid, mintIndex)` pair.

```js
const dedupCoins = (coins) => {
  const txDate = {};
  for (const c of coins) {
    const key = c.mintTxid + '|' + String(c.mintIndex);
    const n = txDate[key];
    if (!n || n < c.dateMs) {
      txDate[key] = c.dateMs;
    }
  }
  return coins.filter((c) => (
    txDate[c.mintTxid + '|' + String(c.mintIndex)] === c.dateMs
  ));
};
```

### Non-solutions
`any()` and `anyLast()` are not working solutions to this problem, `anyLast()` takes the last
row *encountered*, which is not necessarily the last row inserted. This is not merely a theoretical
problem, I have observed incorrect results in testing when using `anyLast()`.

## Reverse-Join update technique
Normally ClickHouse does not support updates in any form, however in many cases one wants to insert
data into a row in multiple steps or otherwise update a single field in a row without affecting the
other fields.

I tested combining data from different sources using the
[SimpleAggregateFunction](https://github.com/ClickHouse/ClickHouse/issues/3852) technique and this
works for getting a table with data which is eventually combined, but it does not work well when
the table being updated has Materialized Views watching it because during an update, the Materialized
Views only see the updated fields, not the entire updated row.

The way the reverse-join update technique works is as follows:

* Create a temporary table with the update data and primary keys of the rows to update
* Insert into the main table:
  * Select from the main where the ID matches any of the primary keys stored in the temporary table
  * ANY RIGHT JOIN with the temporary table
* Drop the temporary table

This is a fairly complex ritual and is best performed by
[SQL-generating code](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/lib/clickhouse.js#L635).
But an example of what the resulting queries would look like is as follows:

The `coins` table is ordered by `(address, mintTxid, mintIndex)` and versioned by `dateMs`. The
temporary table must contain the ordering keys and the `dateMs` field but any other fields are
optional.

```sql
CREATE TEMPORARY TABLE temp_87a01fdafe04f44eca32541e1e (
  address String,
  mintTxid FixedString(64),
  mintIndex Int32,
  state Int8,
  dateMs UInt64,
  value UInt64,
  script String,
  coinbase Int8,
  seenTime DateTime('UTC'),
  mintBlockHash FixedString(64),
  mintHeight Int32,
  mintTime DateTime('UTC')
)
```

Here we insert the update information into the temporary table:
```sql
INSERT INTO temp_2932f06252f6e95c78547fd88d
```

Now the magic, we insert into `coins` a selection from `coins` which is right joined to our
temporary table, using fields from the temporary table if the field is to be updated but using
fields from `coins` if the field is to be left in tact.

```sql
INSERT INTO coins SELECT
    selection.address AS address,
    temp_87a01fdafe04f44eca32541e1e.mintTxid AS mintTxid,
    temp_87a01fdafe04f44eca32541e1e.mintIndex AS mintIndex,
    bitShiftRight(selection.state, 3) + temp_87a01fdafe04f44eca32541e1e.state AS state,
    temp_87a01fdafe04f44eca32541e1e.dateMs AS dateMs,
    selection.value AS value,
    selection.script AS script,
    selection.coinbase AS coinbase,
    selection.seenTime AS seenTime,
    selection.mintBlockHash AS mintBlockHash,
    selection.mintHeight AS mintHeight,
    selection.mintTime AS mintTime,
    temp_87a01fdafe04f44eca32541e1e.spentTxid AS spentTxid,
    temp_87a01fdafe04f44eca32541e1e.spentTxinNum AS spentTxinNum,
    temp_87a01fdafe04f44eca32541e1e.spentBlockHash AS spentBlockHash,
    temp_87a01fdafe04f44eca32541e1e.spentHeight AS spentHeight,
    temp_87a01fdafe04f44eca32541e1e.spentTime AS spentTime,
    temp_87a01fdafe04f44eca32541e1e.spentSequence AS spentSequence
  FROM (
    SELECT
        *
      FROM coins
      WHERE (mintTxid,mintIndex) IN ( SELECT mintTxid,mintIndex FROM temp_87a01fdafe04f44eca32541e1e )
    ORDER BY address,mintTxid,mintIndex, dateMs DESC
    LIMIT 1 BY (address,mintTxid,mintIndex)
  ) AS selection
  RIGHT JOIN temp_87a01fdafe04f44eca32541e1e ON
    selection.mintTxid = temp_87a01fdafe04f44eca32541e1e.mintTxid AND
    selection.mintIndex = temp_87a01fdafe04f44eca32541e1e.mintIndex
```

**NOTE**: In this case we do not know the `address` when we are performing the update, however
because we know that entries in the `coins` table are unique on `(mintTxid, mintIndex)` anyway,
we are able to cheat a little bit. If we wanted to apply an update without knowing any of the
primary keys to be updated, we would need to use an `ALL RIGHT JOIN`.

Finally we drop our temporary table
```sql
DROP TABLE temp_87a01fdafe04f44eca32541e1e
```

## State field
In order to make effective use of Materialized Views for computing sums, we need to avoid
double-counting data whenever a row is *updated*, to solve this I implemented a field called
*state*. You may notice in the Reverse-Join update example, the state field is the one field
which is treated rather specially:

`bitShiftRight(selection.state, 3) + temp_87a01fdafe04f44eca32541e1e.state AS state,`

There are 5 possible states that a row can currently be in, you can read more about the
state field for the needs of this project in
[About state](https://github.com/cjdelisle/pkt-explorer-backend#about-state) but the general
purpose of the state field is to hold both the current state and the previous state.

Every time there is an update, the state field is shifted 3 bits to the right and the new
state is placed in the upper 3 bits, therefore the state field represents a *state transition*
rather than a static state and materialized views can filter only to update based on state
transitions which are important to them.

While this works and is efficient, if I had it to do over again, I would use 2 fields and
filter on state transitions that way:

```sql
temp_87a01fdafe04f44eca32541e1e.state AS state
selection.state                       AS previousState
```

# PKT-Explorer Backend

This is a backend for the PKT block explorer, it implements an API based on the
[BitCore Node API](https://github.com/bitpay/bitcore/blob/master/packages/bitcore-node/docs/api-documentation.md)
but with some features added and others changed or removed.


## Why not Bitcore ?
This backend is based on the [ClickHouse](https://clickhouse.yandex/) database which is not only
blazing fast for the analytical type workloads typical of a block explorer, but also allows for the
creation of
[Materialized Views](https://www.altinity.com/blog/clickhouse-materialized-views-illuminated-part-1),
which allow the aggregation of data in real time as the data is received. For example, the `/richlist`
endpoint which computes balances of all active addresses in the blockchain takes 5 minutes and 16
seconds to compute using Bitcore's MongoDB database so it can only reasonably be run periodically,
leading to stale data. Even with ClickHouse it takes 9 seconds to compute the rich list, much better
but still far too much to wait for a page to load. But, using a Materialized View, the data can be
aggregated in real time as each new block is discovered, allowing the data to be always up to date
and instantly accessible.


## How to setup
First, you will need to setup a ClickHouse database server, you do not need to create any databases
or tables, this will be done by the *syncer*. Once you have ClickHouse setup, you should copy
`config.example.js` to `config.js` and then edit the file to add your username and password for
ClickHouse, and for the PKT/Bitcoin RPC.

You will need a recent version of nodejs (this software was developed using `v10.16.3`), then you
will need to install the dependencies using npm.

    npm install

Once you have this completed, launch the syncer and wait for it to insert the blockchain into
the database. This backend supports storing data on multiple blockchains but you will need one
syncer process per blockchain.

    node ./syncer.js --chain 'PKT/pkt'

The syncer will insert blocks into the database in batches of 1000. Once it is synced you should
see a log line looking like this:

    [snc] DEBUG: Chain synced

After the chain is synced (or before, if you're excited to see results), you can launch the server.
The server is chain-agnostic, it will serve data on whichever chains are specified in the
`config.js` file.

    node ./server.js --port 3000

The server is also stateless, so if you wish, you can run more than one process, however as must
of the computation is done at the ClickHouse level, it is unlikely that you will need more than
one.


## API
The API of this backend is explained through the datatypes, then the details such as the Network
Steward which affect how this backend functions (when using the PKT blockchain) and finally a
listing of the exact endpoints.

### Datatypes
There are 3 key datatypes which are returned by this API, they are the block, the transaction
and the coins type.

#### Block
The block consists of the following fields:

* **hash**: `string` This is the hex coded SHA-256 hash of the block, this serves as it's primary ID
* **height**: `number` This is the *declared* height of the block, its presence does not prove that the
block is not a fork of the main chain.
* **version**: `number` This is the version number as defined in the bitcoin specification.
* **size**: `number` This is the size, in bytes, of the block header and content.
* **merkleRoot**: `string` This is the merkle root hash of the merkle tree of transactions.
* **time**: `string` This is the *declared* time when the block was created.
It is a string representation of a javascript Date object.
* **nonce**: `number` This is the nonce as it is in the block header.
* **bits**: `number` This is the
[nBits](https://en.bitcoin.it/wiki/Difficulty#How_is_difficulty_stored_in_blocks.3F)
field from the block header.
* **difficulty**: `number` This is a floating point number representing how many times the minimum
difficulty is the current difficulty, this number is synthetic, it appears nowhere in the actual
block.
* **previousBlockHash**: `string` This is the **hash** of the previous block in the chain.
* **transactionCount**: `number` This is the number of transactions present in the block.
* **dateMs**: `string` This is an internal number used by the database for versioning, it represents
the number of milliseconds since the [UNIX Epoch](https://en.wikipedia.org/wiki/Unix_time) which is
the time when the block was most recently inserted or updated. It is a base-10 string representation
of a number.

The typescript/flow format of this data is as follows:

```js
export type tbl_blk_t = {
  hash: string,
  height: number,
  version: number,
  size: number,
  merkleRoot: string,
  time: number,
  nonce: number,
  bits: number,
  difficulty: number,
  previousBlockHash: string,
  transactionCount: number,
  dateMs: number
};
```

#### Transaction
A transaction data structure represents a transaction in the blockchain, it contains only
the metadata of the transaction, not any of the inputs or outputs, it also does not contain
any information about whether the transaction was accepted in a block or not.

The transaction object consists of the following fields:

* **txid**: `string` The hash of the transaction, used as it's identifier
* **size**: `number` The number of bytes of the transaction *including segwit witnesses*
* **version**: `number` The version field of the transaction
* **locktime**: `number` The
[lock_time](https://en.bitcoin.it/wiki/Transaction#General_format_of_a_Bitcoin_transaction_.28inside_a_block.29)
field of the serialized transaction
* **inputCount**: `number` The number of transaction inputs *excluding the coinbase input*
* **outputCount**: `number` The number of transaction outputs
* **value**: `string` The number of atomic units (e.g. Satoshis) which the transaction transfers.
It is a base-10 string representation of a number.
* **coinbase**: `string` If the transaction is a coinbase transaction, this is the scriptSig of
the coinbase input, this is used by miners to store data in the blockchain. If the transaction is
not a coinbase transaction then this is an empty string.
* **firstSeen** `string` This is a string representation of the time when the transaction was first
discovered by the block explorer. This is a string representation of a Javascript Date object.
* **dateMs**: `string` This is an internal number used by the database for versioning, it represents
the number of milliseconds since the [UNIX Epoch](https://en.wikipedia.org/wiki/Unix_time) which is
the time when the transaction was most recently inserted or updated. It is a base-10 string representation
of a number.

The flow/typescript representation of the transaction is as follows:

```js
export type tbl_tx_t = {
  txid: string,
  size: number,
  version: number,
  locktime: number,
  inputCount: number,
  outputCount: number,
  value: string,
  coinbase: string,
  firstSeen: string,
  dateMs: string
};
```

#### Coins
The coins data structure represents a transaction output which may or may not have been spent.
Unlike the Transaction data structure, this data structure does contain information about whether
the transaction was actually included in a block, and if it was -- whether it was subsequently
spent.

Fields of the coins data structure include:

* **address**: `string` The address that was paid to
if [the payment is not to an address](https://en.bitcoin.it/wiki/Contract) then empty string
* **mintTxid**: `string` The transaction id of the transaction where this output was placed
* **mintIndex**: `number` The zero-based output number of this transaction output
* **state**: `number` The state of this payment, see below for more information
* **dateMs**: `string` This is an internal number used by the database for versioning, it represents
the number of milliseconds since the [UNIX Epoch](https://en.wikipedia.org/wiki/Unix_time) which is
the time when the entry was most recently inserted or updated. It is a base-10 string representation
of a number.
* **value**: `number` The number of atomic units (e.g. Satoshis) which the transaction transfers.
**TODO**: this will soon become a string representation of a base-10 number soon in order to avoid
rounding errors with javascript.
* **script**: `string` This is a base64 representation of the [ScriptPubKey](https://en.bitcoin.it/wiki/Transaction#Output) for the transaction output.
* **coinbase**: `number` One if the output is a coinbase payment, two if the output is a payment of a
[network steward](#network-steward) funding payment. Zero for any non-coinbase transaction.
* **seenTime**: `string` This is the time when the transaction containing this output was first seen,
whether in a block or as a free transaction. This is a string representation of a Javascript Date
object.
* **mintBlockHash**: `string` If the transaction *making* this payment was included in a block, this
is the hash of the block, otherwise it is the empty string.
* **mintHeight**: `number` If the transaction *making* this payment was included in a block, this
is the declared height of that block, otherwise it is zero.
* **mintTime**: `string` If the transaction *making* this payment was included in a block, this
is the time declared in the block header, otherwise it is the empty string.
* **spentTxid**: `string` If there is a known transaction *spending* this payment, this is it's
identifier. Otherwise it is the empty string.
* **spentTxinNum**: `number` If there is a known transaction *spending* this payment, this is the
zero-based index of the input in the input list of that transaction, otherwise it is zero. Caution:
zero is a valid input number so you must check that **spentTxid** is a valid hash.
* **spentBlockHash**: `string` If there is a known transaction *spending* this payment which has
landed in a block, this is the hash of that block.
* **spentHeight**: `number` If there is a known transaction *spending* this payment which has landed
in a block, this is the declared height of that block, otherwise it is zero. Caution: just because
the height of the block is declared does not prove that the block is not a fork of the main chain,
you must check the **state** field to determine the payment's current state.
* **spentTime**: `string` If there is a known transaction *spending* this payment, this is the time
when that transaction was first seen. Otherwise it is empty string.
* **spentSequence**: `number` If there is a known transaction *spending* this payment, this is the
[sequence number](https://bitcoin.stackexchange.com/questions/2025/what-is-txins-sequence) of the
spending transaction input.

##### About State
The **state** field is an important field which explains the current state of a payment. There are
5 possible states and for each state there are 5 possible previous states, making for a total of
25 possible values of the state field. The layout of the state field contains two values, current
state and previous state and the layout is as follows:

```
 0 1 2 3 4 5 6 7
+-+-+-+-+-+-+-+-+
| u |  sc |  sp |
+-+-+-+-+-+-+-+-+
```

* **u**: unused, these bits should always be zero
* **sc**: the current state
* **sp**: the previous state

###### State types

* **nothing**: `0` This should only exist as a previous state, never as a current state, it means
that previously the transaction has not been seen in any form.
* **mempool**: `1` This state indicates that the transation is minted in a block but it is
has not yet been spent
* **block**: `2` This state indicates that the transation is minted in a block but it is
has not yet been spent
* **spent**: `3` This state indicates that the coins have been spent and the spending
transaction has landed in a block. NOTE: This implementation does not distinguish between coins
which have been spent by a transaction that has not landed in a block and coins which have not yet
been spent at all
* **burned**: `4` this is a state specific to the PKT blockchain which has a Network Steward,
coins which are generated for the Network Steward enter this state if they have not been
transferred within 3 months (exactly 129600 blocks).

###### Example

The state `26` in binary is represented as `00011010`, breaking this into unused, current state
and previous state, we get `[ 00, 011, 010 ]`, parsing the current state and previous state as
integers, we get `[ 3, 2 ]`, therefore state number 26 is coins which have been spent, but
previously they were in the **block** state.

An example of a transaction which has already been spent is as follows:

```json
{
        "address": "pGsZXFt5d7WZhgWbXTY1VtfdicfCJ9Q3Hs",
        "mintTxid": "7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03",
        "mintIndex": 0,
        "state": 26,
        "dateMs": "1576862534188",
        "value": 3582061445120,
        "script": "dqkUfEC4GbsCBeikRJ3bHRkusAYLKiOIrA==",
        "coinbase": 1,
        "seenTime": "2019-08-20T02:56:48.000Z",
        "mintBlockHash": "f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd",
        "mintHeight": 1,
        "mintTime": "2019-08-20T02:56:48.000Z",
        "spentTxid": "598794e24ba5cd0074d29574ea7f0c85dcf46d2867da10ebcadc6e8d4fa0e63a",
        "spentTxinNum": 8,
        "spentBlockHash": "9ae28c808eb3bd6d2b3d826c482047cb81c61ed92703447f2886782477356dbf",
        "spentHeight": 176079,
        "spentTime": "2019-12-13T19:24:40.000Z",
        "spentSequence": 4294967295
}
```

An example of a transaction which has not been spent is as follows (if you observe closely,
you will notice that this transaction is now in the state **burned** and therefore it cannot
be spent)

```json
{
        "address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
        "mintTxid": "7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03",
        "mintIndex": 1,
        "state": 34,
        "dateMs": "1576862654731",
        "value": 891146993664,
        "script": "ACDVwQBcDUAS064mcjGef56xWldRau76u7wGImX2fjCPKw==",
        "coinbase": 2,
        "seenTime": "2019-08-20T02:56:48.000Z",
        "mintBlockHash": "f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd",
        "mintHeight": 1,
        "mintTime": "2019-08-20T02:56:48.000Z",
        "spentTxid": "",
        "spentTxinNum": 0,
        "spentBlockHash": "",
        "spentHeight": 0,
        "spentTime": "",
        "spentSequence": 0
}
```

The flow/typescript representation of the transaction is as follows:

```js
export type tbl_tx_t = {
  address: string,
  mintTxid: string,
  mintIndex: number,
  state: number,
  dateMs: string,
  value: number,
  script: string,
  coinbase: number,
  seenTime: string,
  mintBlockHash: string,
  mintHeight: number,
  mintTime: string,
  spentTxid: string,
  spentTxinNum: number,
  spentBlockHash: string,
  spentHeight: number,
  spentTime: string,
  spentSequence: number
};
```

### Network Steward
The Network Steward is an institution of the PKT blockchain, by consensus rule it receives exacly
`51/256` of each new block payout. The network steward is subject to 2 additional consensus rules:

1. The address receiving the network steward payout can be changed by a proof-of-stake based voting
process.
2. The payments to the network steward address must be transacted within 3 months or else they will
become nolonger spendable. The exact number of blocks before a NS payment burns is `129600` blocks.

When using this explorer with a blockchain other than PKT, you need not worry about the Network
Steward infrastructure.

### API Endpoints
What follows is an explanation of the API that this server backend provides. None of the endpoints
are permissioned and the no "modification" of the database occurs other than the creation of
temporary tables in order to support some of the more complex queries.

#### Paged Queries
Some API endpoints end with `/[<limit>/][<pageNum>]`, these endpoints allow for accessing data
which is too much to take in a single request, in every case the first field `limit` is the maximum
number of results that you want to receive and the second field `pageNum` is the number of times
`limit` worth of requests to skip over at the beginning.

Each paged request endpoint has a maximum possible limit, if the limit is set to zero or is
greater than this maximum, then the maximum will be assumed.

Whenever you make a request to a paged API, included with the response you will receive two
additional fields:

* **prev** `string` If the requested page is not the first page, this is a relative URL which
provides the previous page of results. If this is the first page then this field will be the empty
string.
* **next** `string` If the requested page is not the *last* page of results of the query then
this will be the next page of results for the same query. If the current page is the *last* page
then this field will be the empty string.

### GET /api/status/enabled-chains
This query is answered by the server without consulting the database, it returns the chains which
are configured in the `config.js` file.

The answer from this endpoint will be:

```js
Array<{
  chain: string,
  network: string
}>
```

```bash
$ curl http://localhost:3000/api/status/enabled-chains ; echo
```

<details>
<summary><b>Response</b></summary>
<br>

```json
[
        {
                "chain": "PKT",
                "network": "pkt"
        }
]
```
</details>

### GET `/api/<chain>/<network>/valid/<address_number_or_hash>`
This will verify whether a given number, address, or hash is valid for the given chain.
If `address_number_or_hash` is a string of 32 hex pairs then it will be automatically accepted as
potentially a transaction or a block hash.
If it is a number, then it will be accepted if and only if it is an integer greater than or equal
to zero as this is a potential block number.
If the input matches neither of these things, this backend will attempt to decode it as a
[Base58Check](https://en.bitcoin.it/wiki/Base58Check_encoding) address encoding for the specified
blockchain.
Finally, if it is none of the above, this backend will attempt to decode it as a
[bech32](https://en.bitcoin.it/wiki/Bech32) segwit address.

The response from this endpoint will be:

```js
{
  isValid: boolean,
  type: 'blockOrTx'|'addr'|'invalid'
}
```

```bash
$ curl http://localhost:3000/api/PKT/pkt/valid/1 ; echo
```

<details>
<summary><b>Response and more examples</b></summary>
<br>

```bash
{
        "isValid": true,
        "type": "blockOrTx"
}

## Invalid block number, not a positive integer or zero
$ curl http://localhost:3000/api/PKT/pkt/valid/3.14159 ; echo
{
        "isValid": false,
        "type": "invalid"
}

## Invalid block number, not the cannonical Base10 representation of the number
$ curl http://localhost:3000/api/PKT/pkt/valid/1e3 ; echo
{
        "isValid": false,
        "type": "invalid"
}

## Valid block or TX hash, independent of which blockchain
$ curl http://localhost:3000/api/PKT/pkt/valid/4ef47f6eb681d5d9fa2f7e16336cd629303c635e8da51e425b76088be9c8744c ; echo
{
        "isValid": true,
        "type": "blockOrTx"
}

## Valid Base58 address
$ curl http://localhost:3000/api/PKT/pkt/valid/p96XfSnLNM9etQWVvzhUqkqBJwJKs3Lfdx ; echo
{
        "isValid": true,
        "type": "addr"
}

## Valid Bech32 address
$ curl http://localhost:3000/api/PKT/pkt/valid/pkt1qte4ujntt5r40ws8le6m0u4qnkav8z78a8xxsuy ; echo
{
        "isValid": true,
        "type": "addr"
}

## Valid Bech32 address but wrong blockchain
$ curl http://localhost:3000/api/PKT/pkt/valid/bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq ; echo
{
        "isValid": false,
        "type": "invalid"
}
```
</details>

### GET ```/api/<chain>/<network>/stats/richlist[/<limit>][/<pageNum>]```
This is a [paged query](#paged-queries), the maximum allowable limit is 500 results. It provides
balance information for the "richest" addresses known to this block explorer.

The result is in the form as follows, the values of `balance`, `unconfirmed`, `received` and `spent`
are string representatins of numbers in base-10, in order to avoid rounding errors from Jaavscript.
Also the numbers are in the atomic unit of currency (e.g. the Satoshi).

```js
{
  results: Array<{
    address: string,
    balance: string,
    unconfirmed: string,
    received: string,
    spent: string
  }>,
  prev: string,
  next: string
}
```

```bash
$ curl http://localhost:3000/api/PKT/pkt/stats/richlist/3/1
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
        "results": [
                {
                        "address": "pkt1qkpuqg30wm0ju40yd4hyk7ehc48cy7mgj64xl7vxwt7mxxwqrt9qqetwlau",
                        "balance": "436625115681516374",
                        "unconfirmed": "0",
                        "received": "436627479842070165",
                        "spent": "2364160553791"
                },
                {
                        "address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
                        "balance": "113021838181350134",
                        "unconfirmed": "0",
                        "received": "166448774269176147",
                        "spent": "10783770147016285"
                },
                {
                        "address": "pkt1q3rnwa8jw0ucs2qgxlrm06kfxwljlqxpzr85t9r30jv43fj7j29dquswyxt",
                        "balance": "66155320614582627",
                        "unconfirmed": "0",
                        "received": "66155320614582627",
                        "spent": "0"
                }
        ],
        "prev": "",
        "next": "/stats/richlist/3/2"
}
```
</details>

### GET `/api/<chain>/<network>/stats/daily-transactions`

This provides the number of transactions which have landed in the chain each day.
Coinbase transactions are counted and the days are separated by the day in UTC time.
The result is in ascending order between the day 31 days ago and yesterday. The
currently ongoing day is excluded. The date field is a string representation of a
Javascript Date object.

Result format:

```js
{
  results: Array<{
    date: string,
    transactionCount: number
  }>
}
```

```bash
$ curl http://localhost:3000/api/PKT/pkt/stats/daily-transactions
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
        "results": [
                {
                        "date": "2019-11-22T00:00:00.000Z",
                        "transactionCount": 1746
                },
                {
                        "date": "2019-11-23T00:00:00.000Z",
                        "transactionCount": 2344
                },
                {
                        "date": "2019-11-24T00:00:00.000Z",
                        "transactionCount": 1618
                },
                {
                        "date": "2019-11-25T00:00:00.000Z",
                        "transactionCount": 1494
                },
                {
                        "date": "2019-11-26T00:00:00.000Z",
                        "transactionCount": 1393
                },
                "__continues_until_30_elements__"
        ]
}
```
</details>

### GET `/api/<chain>/<network>/address/<address>/`
This query currently returns nothing but an empty array, in the future it may return
some vital statistics for an address.

### GET `/api/<chain>/<network>/address/<address>/balance`
This query gets the current unconfirmed, confirmed, balance, spent and burned coins for an address
as well as the number of transactions received and spent for that address. All amounts of coins are
base-10 string representations of numbers of atomic units of currency.

* **unconfirmedReceived**: `string` The number of units which were received in a free transaction not
in a block.
* **confirmedReceived**: `string` The number of units which were received (including those spent or burned)
* **balance**: `string` The number of units which were received minus those spent or burned
* **spent**: `string` The number of units which were received and then spent
* **burned**: `string` The number of units which were burned (in case the chain is not PKT, this will
always be zero)
* **recvCount**: `number` The number of transactions which paid this address
* **spentCount**: `number` The number of transactions where this address made payments

```bash
$ curl http://localhost:3000/api/PKT/pkt/address/pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2/balance
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
        "unconfirmedReceived": "0",
        "confirmedReceived": "166474439302593651",
        "balance": "113018986510970390",
        "spent": "10783770147016285",
        "burned": "42671682644606976",
        "recvCount": 193072,
        "spentCount": 12102
}
```
</details>

### GET `/api/<chain>/<network>/address/<address>/coins[/<limit>][/<pageNum>]`
This query gets the transactions which paid to and from this address. It is a
[paged query](#paged-queries) and because of the combinatorial explosion of "related transactions",
no limit greater than 10 is allowed.

The output format is as follows:

```js
{
  count: number,
  coins: Array<Coins_t>,
  mintedTxids: Array<string>,
  spentTxids: Array<string>,
  fundingTxOutputs: Array<Coins_t>,
  fundingTxInputs: Array<Coins_t>,
  spendingTxOutputs: Array<Coins_t>,
  spendingTxInputs: Array<Coins_t>,
  prev: string,
  next: string
}
```

* **count** Is the number of transactions paying to this address which were selected in the query
* **coins** These are the payments paying to this address
* **mintedTxids** The transaction ids of the transactions containing the payments given in **coins**
* **spentTxids** The transaction ids of all transactions which spent any of the payments given in
**coins**
* **fundingTxOutputs** All payments which are part of any one of the transactions which contained
the payments given in coins. If Alice paid Bob, Charlie and David in one transaction, Charlie's
**fundingTxOutputs** should show the payments to Bob and David in this section.
* **fundingTxInputs** All transaction outputs which were *spent* in order to fund the transactions
that paid the outputs given in **coins**.
* **spendingTxOutputs** For any one of **coins** which has already been spent, this is the payment
which spent that payment on. For example if Alice paid Bob, Charlie and David and then Charlie paid
some that money on to Elenore, the payment to Elenore would appear in Charlie's **spendingTxOutputs**.
* **spendingTxInputs** For any of the transactions specified in **spendingTxOutputs**, these are
additional inputs which helped to fund those transactions. Continuing our example: if Charlie paid
Elenore but he also used some other coins from a change address that he had lying around, the
payment to that change address would appear here.

In technical terms:
* **fundingTxInputs** are payments where the `spentTxid = coins.mintTxid`
* **fundingTxOutputs** are payments where `mintTxid = coins.mintTxid`
* **spendingTxInputs** are payments where `spentTxid = coins.spentTxid`
* **spendingTxOutputs** are payments where `mintTxid = coins.spentTxid`

```bash
$ curl http://localhost:3000/api/PKT/pkt/address/pkt1qqqpseuqdmfdxd9lncr6jxzvfaj8rudkd9kvujr/coins/1/1
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
	"count": 1,
	"coins": [
		{
			"address": "pkt1qqqpseuqdmfdxd9lncr6jxzvfaj8rudkd9kvujr",
			"mintTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
			"mintIndex": 0,
			"state": 26,
			"dateMs": "1577058786238",
			"value": 417101310,
			"script": "ABQAAwzwDdpaZpfzwPUjCYnsjj42zQ==",
			"coinbase": 0,
			"seenTime": "2019-12-22T23:51:53.000Z",
			"mintBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
			"mintHeight": 189588,
			"mintTime": "2019-12-22T23:51:53.000Z",
			"spentTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
			"spentTxinNum": 1,
			"spentBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55",
			"spentHeight": 189590,
			"spentTime": "2019-12-22T23:52:48.000Z",
			"spentSequence": 4294967295
		}
	],
	"mintedTxids": [
		"bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f"
	],
	"spentTxids": [
		"d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac"
	],
	"fundingTxOutputs": [
		{
			"address": "pNVUbaBwDwLFLj6UHSZuKDGxV7tXnqyzJa",
			"mintTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
			"mintIndex": 1,
			"state": 16,
			"dateMs": "1577058726450",
			"value": 1073741824,
			"script": "dqkUueQ2BKkZfqQmi102h7U0IJRLN+GIrA==",
			"coinbase": 0,
			"seenTime": "2019-12-22T23:51:53.000Z",
			"mintBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
			"mintHeight": 189588,
			"mintTime": "2019-12-22T23:51:53.000Z",
			"spentTxid": "",
			"spentTxinNum": 0,
			"spentBlockHash": "",
			"spentHeight": 0,
			"spentTime": "",
			"spentSequence": 0
		},
		{
			"address": "pkt1qqqpseuqdmfdxd9lncr6jxzvfaj8rudkd9kvujr",
			"mintTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
			"mintIndex": 0,
			"state": 26,
			"dateMs": "1577058786238",
			"value": 417101310,
			"script": "ABQAAwzwDdpaZpfzwPUjCYnsjj42zQ==",
			"coinbase": 0,
			"seenTime": "2019-12-22T23:51:53.000Z",
			"mintBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
			"mintHeight": 189588,
			"mintTime": "2019-12-22T23:51:53.000Z",
			"spentTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
			"spentTxinNum": 1,
			"spentBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55",
			"spentHeight": 189590,
			"spentTime": "2019-12-22T23:52:48.000Z",
			"spentSequence": 4294967295
		}
	],
	"fundingTxInputs": [
		{
			"address": "pNZrb6dHks4ALp9kv9GwxM4RQFXd79VoZQ",
			"mintTxid": "7a73533cfbb2ffcba8bc357917a34f6ed52275a5f4d25aca0c4e5e8d2009db87",
			"mintIndex": 71,
			"state": 26,
			"dateMs": "1577058726451",
			"value": 978945867,
			"script": "dqkUurg7kak7L4E0NmKrO2jvdCUHDHyIrA==",
			"coinbase": 1,
			"seenTime": "2019-12-22T22:09:23.000Z",
			"mintBlockHash": "62f3f8cc643e036223cfa9dba1d1e52d7b916767988b5912d8ab17f0d6ab8481",
			"mintHeight": 189487,
			"mintTime": "2019-12-22T22:09:23.000Z",
			"spentTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
			"spentTxinNum": 0,
			"spentBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
			"spentHeight": 189588,
			"spentTime": "2019-12-22T23:51:53.000Z",
			"spentSequence": 4294967295
		},
		{
			"address": "pkt1qstcqkl5nzn73wge32rjf8rcx086g4j68t70d46",
			"mintTxid": "269a517568fb68605a4c42ff64d65f8f9e6c2457030e04eca8850131ca2718c2",
			"mintIndex": 0,
			"state": 26,
			"dateMs": "1577058726451",
			"value": 511897560,
			"script": "ABSC8At+kxT9FyMxUOSTjwZ59IrLRw==",
			"coinbase": 0,
			"seenTime": "2019-12-22T23:48:06.000Z",
			"mintBlockHash": "f9fff164b16e3dbfe6df57d30a037f49e807a8544c01353bbea835d2c2e6622d",
			"mintHeight": 189586,
			"mintTime": "2019-12-22T23:48:06.000Z",
			"spentTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
			"spentTxinNum": 1,
			"spentBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
			"spentHeight": 189588,
			"spentTime": "2019-12-22T23:51:53.000Z",
			"spentSequence": 4294967295
		}
	],
	"spendingTxOutputs": [
		{
			"address": "pNVUbaBwDwLFLj6UHSZuKDGxV7tXnqyzJa",
			"mintTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
			"mintIndex": 1,
			"state": 16,
			"dateMs": "1577058786237",
			"value": 1073741824,
			"script": "dqkUueQ2BKkZfqQmi102h7U0IJRLN+GIrA==",
			"coinbase": 0,
			"seenTime": "2019-12-22T23:52:48.000Z",
			"mintBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55",
			"mintHeight": 189590,
			"mintTime": "2019-12-22T23:52:48.000Z",
			"spentTxid": "",
			"spentTxinNum": 0,
			"spentBlockHash": "",
			"spentHeight": 0,
			"spentTime": "",
			"spentSequence": 0
		},
		{
			"address": "pkt1q5wq8e6zpqk2l8x2nypjppugy7nnjhnrr8dqk7n",
			"mintTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
			"mintIndex": 0,
			"state": 26,
			"dateMs": "1577059021357",
			"value": 323217867,
			"script": "ABSjgHzoQQWV85lTIGQQ8QT05yvMYw==",
			"coinbase": 0,
			"seenTime": "2019-12-22T23:52:48.000Z",
			"mintBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55",
			"mintHeight": 189590,
			"mintTime": "2019-12-22T23:52:48.000Z",
			"spentTxid": "918f463f650e94f241b19ace04baf3d2d1b3bb2e118767b09e33700695f155bc",
			"spentTxinNum": 1,
			"spentBlockHash": "6930ba944295369d687de338abd3681ea45a80274f5702239325a0701d0b2b2b",
			"spentHeight": 189592,
			"spentTime": "2019-12-22T23:54:23.000Z",
			"spentSequence": 4294967295
		}
	],
	"spendingTxInputs": [
		{
			"address": "pNZrb6dHks4ALp9kv9GwxM4RQFXd79VoZQ",
			"mintTxid": "98ed1391d5492ff75ac0354cc2f4ec274a43f6e8821f799fd0e0744b339481fe",
			"mintIndex": 40,
			"state": 26,
			"dateMs": "1577058786238",
			"value": 979858674,
			"script": "dqkUurg7kak7L4E0NmKrO2jvdCUHDHyIrA==",
			"coinbase": 1,
			"seenTime": "2019-12-22T22:09:43.000Z",
			"mintBlockHash": "043f40643bb932c25684a6c42d93e9fd942880fd626c73694730e256e1eed9e2",
			"mintHeight": 189489,
			"mintTime": "2019-12-22T22:09:43.000Z",
			"spentTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
			"spentTxinNum": 0,
			"spentBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55",
			"spentHeight": 189590,
			"spentTime": "2019-12-22T23:52:48.000Z",
			"spentSequence": 4294967295
		},
		{
			"address": "pkt1qqqpseuqdmfdxd9lncr6jxzvfaj8rudkd9kvujr",
			"mintTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
			"mintIndex": 0,
			"state": 26,
			"dateMs": "1577058786238",
			"value": 417101310,
			"script": "ABQAAwzwDdpaZpfzwPUjCYnsjj42zQ==",
			"coinbase": 0,
			"seenTime": "2019-12-22T23:51:53.000Z",
			"mintBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
			"mintHeight": 189588,
			"mintTime": "2019-12-22T23:51:53.000Z",
			"spentTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
			"spentTxinNum": 1,
			"spentBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55",
			"spentHeight": 189590,
			"spentTime": "2019-12-22T23:52:48.000Z",
			"spentSequence": 4294967295
		}
	],
	"prev": "",
	"next": "/address/pkt1qqqpseuqdmfdxd9lncr6jxzvfaj8rudkd9kvujr/coins/1/2"
}
```
</details>

### GET `/api/<chain>/<network>/block?<PARAMS>`

DEPRECATED: This will soon be replaced by a /mainchain standard form [paged query](#paged-queries).

This query gets metadata from the main chain of blocks, the order is always decending by height.
The PARAMS field must contain a `limit` parameter which specifies the maximum number of blocks
that will be returned. The `since` field allows skipping some blocks in order to implement paging.

The return value is an array of [tbl_blk_t](#block) entries.

Example:

```bash
$ curl 'http://localhost:3000/api/PKT/pkt/block?limit=2&since=500'
```

<details>
<summary><b>Response</b></summary>
<br>

```json
[
        {
                "hash": "7cb0f813bd7d67d4bb81cce9a178e6a75560e7e7b9f263efcf4f286815717a14",
                "height": 499,
                "version": 536870912,
                "size": 6370,
                "merkleRoot": "b311dd66c7d0f23625ec52665d3a3ca02007718fd4567c5777abd4be1bc9ba61",
                "time": "2019-08-20T10:19:28.000Z",
                "nonce": 896674102,
                "bits": 521142271,
                "difficulty": 1,
                "previousBlockHash": "b2cbb684cd64c46fe6a6f04a588ab743e608a8d906057abb748c9585bb772f94",
                "transactionCount": 1,
                "dateMs": "1576861600840"
        },
        {
                "hash": "b2cbb684cd64c46fe6a6f04a588ab743e608a8d906057abb748c9585bb772f94",
                "height": 498,
                "version": 536870912,
                "size": 6130,
                "merkleRoot": "4a12c806cf43597c75d80ae402d09385859173dd9106857757bb5dee0b8f0cff",
                "time": "2019-08-20T10:17:53.000Z",
                "nonce": 1100409937,
                "bits": 521142271,
                "difficulty": 1,
                "previousBlockHash": "7db4a81871809d1b036cb8074561f00454dd7d26aeca1b2034f2f5d695270ea5",
                "transactionCount": 1,
                "dateMs": "1576861600840"
        }
]
```
</details>

### GET `/api/<chain>/<network>/block/tip`

DEPRECATED: This will soon be replaced by a /mainchain standard form [paged query](#paged-queries).

This is simply an alias for `/api/<chain>/<network>/block/?limit=1`

### GET `/api/<chain>/<network>/block/<number_or_hash>`

This query results in a single block type entry, it can be specified by number
(i.e. main chain height) or by hash.

WARNING: specifying by number is deprecated and will eventually be replaced by a /mainchain
[paged query](#paged-queries). Specifying by hash will still work.

The result is a simple [tbl_blk_t](#block) type value.

```bash
## Using block number
$ curl http://localhost:3000/api/PKT/pkt/block/1 ; echo

## Using block hash (same result)
$ curl http://localhost:3000/api/PKT/pkt/block/f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd ; echo
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
        "hash": "f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd",
        "height": 1,
        "version": 536870912,
        "size": 5528,
        "merkleRoot": "7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03",
        "time": "2019-08-20T02:56:48.000Z",
        "nonce": 719613575,
        "bits": 521142271,
        "difficulty": 1,
        "previousBlockHash": "0bdc1712a46194e552cf417ab0439c2d4f456c35cf63a0a406964c6f93432d85",
        "transactionCount": 1,
        "dateMs": "1576861600840"
}
```
</details>

### GET `/api/<chain>/<network>/block/<hash>/coins[/<limit>][/<page>]`

This is a query to get all of the payments related to the transactions in a particular block.
This is a standard [paged query](#paged-queries)

Response format:
```js
{
  txids: Array<string>,
  inputs: Array<Coins_t>,
  outputs: Array<Coins_t>,
  prev: string,
  next: string
}
```

The response fields include:

* **txids**: The transaction ids of all transactions included in this block
* **inputs**: The payments which were *spent* in order to fund the transactions included in this
block
* **outputs**: The payments which were created by the transactions in this block
* **prev**: The [paged query](#paged-queries) previous page
* **next**: The [paged query](#paged-queries) next page

```bash
$ curl http://localhost:3000/api/PKT/pkt/block/f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd/coins/100/1 ; echo
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
        "txids": [
                "7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03"
        ],
        "inputs": [],
        "outputs": [
                {
                        "address": "pGsZXFt5d7WZhgWbXTY1VtfdicfCJ9Q3Hs",
                        "mintTxid": "7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03",
                        "mintIndex": 0,
                        "state": 26,
                        "dateMs": "1576862534188",
                        "value": 3582061445120,
                        "script": "dqkUfEC4GbsCBeikRJ3bHRkusAYLKiOIrA==",
                        "coinbase": 1,
                        "seenTime": "2019-08-20T02:56:48.000Z",
                        "mintBlockHash": "f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd",
                        "mintHeight": 1,
                        "mintTime": "2019-08-20T02:56:48.000Z",
                        "spentTxid": "598794e24ba5cd0074d29574ea7f0c85dcf46d2867da10ebcadc6e8d4fa0e63a",
                        "spentTxinNum": 8,
                        "spentBlockHash": "9ae28c808eb3bd6d2b3d826c482047cb81c61ed92703447f2886782477356dbf",
                        "spentHeight": 176079,
                        "spentTime": "2019-12-13T19:24:40.000Z",
                        "spentSequence": 4294967295
                },
                {
                        "address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
                        "mintTxid": "7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03",
                        "mintIndex": 1,
                        "state": 34,
                        "dateMs": "1576862654731",
                        "value": 891146993664,
                        "script": "ACDVwQBcDUAS064mcjGef56xWldRau76u7wGImX2fjCPKw==",
                        "coinbase": 2,
                        "seenTime": "2019-08-20T02:56:48.000Z",
                        "mintBlockHash": "f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd",
                        "mintHeight": 1,
                        "mintTime": "2019-08-20T02:56:48.000Z",
                        "spentTxid": "",
                        "spentTxinNum": 0,
                        "spentBlockHash": "",
                        "spentHeight": 0,
                        "spentTime": "",
                        "spentSequence": 0
                },
                {
                        "address": "",
                        "mintTxid": "7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03",
                        "mintIndex": 2,
                        "state": 16,
                        "dateMs": "1576861600948",
                        "value": 0,
                        "script": "ajAJ+REC/w8AIH7k4dPmy9DAY6bkv5qDVJ9srkNKLAb4WX5mfU0lcjWzsgEAAAAAAAA=",
                        "coinbase": 1,
                        "seenTime": "2019-08-20T02:56:48.000Z",
                        "mintBlockHash": "f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd",
                        "mintHeight": 1,
                        "mintTime": "2019-08-20T02:56:48.000Z",
                        "spentTxid": "",
                        "spentTxinNum": 0,
                        "spentBlockHash": "",
                        "spentHeight": 0,
                        "spentTime": "",
                        "spentSequence": 0
                }
        ],
        "prev": "",
        "next": ""
}
```
</details>

### GET `/api/<chain>/<network>/tx/?blockHash=<hash>`
This query gets the basic transaction metadata related to all transactions included in a given
block.

The result format is an array of [tbl_tx_t](#transaction)

```bash
$ curl http://localhost:3000/api/PKT/pkt/tx?blockHash=13255430c58379279671e4486131d3f5b5e8914126ccabc83f600062c123cd16
```

<details>
<summary><b>Response</b></summary>
<br>

```json
[
        {
                "txid": "3ca8e8480dbd8a16886c352a958c78d88fcb6cc6e45509511368198e0134fa28",
                "size": 369,
                "version": 1,
                "locktime": 0,
                "inputCount": 2,
                "outputCount": 2,
                "value": "1344104419",
                "coinbase": "",
                "firstSeen": "2019-12-23T00:21:07.000Z",
                "dateMs": "1577060508767"
        },
        {
                "txid": "9f3c0dabb7f38c51abc8129dbcc522865cb41e27f7c0e346b0b677bd6871a2ba",
                "size": 3297,
                "version": 1,
                "locktime": 0,
                "inputCount": 0,
                "outputCount": 92,
                "value": "4025887595571",
                "coinbase": "03b4e402000b2f503253482f706b74642f",
                "firstSeen": "2019-12-23T00:21:07.000Z",
                "dateMs": "1577060508767"
        },
        {
                "txid": "a11b24f27f48c56c0488fcb64ce1c01ffe0207dbb9db5bd68b9a8baf7de8034f",
                "size": 373,
                "version": 1,
                "locktime": 0,
                "inputCount": 2,
                "outputCount": 2,
                "value": "1864964756",
                "coinbase": "",
                "firstSeen": "2019-12-23T00:21:07.000Z",
                "dateMs": "1577060508767"
        }
]
```
</details>

### GET `/api/PKT/pkt/tx/<txid>`
This endpoint gets a particular transaction in the standard form ([tbl_tx_t](#transaction)),
plus a few extra fields, the additional fields relate to the transaction's current status:

Additional fields include:
* **blockTime** `string` A string representation of the Javascript date declared in the block
* **blockHash** `string` The hash of the most recent valid block to include the transaction
* **blockHeight** `number` The *declared height* of the block. Caution: the block still may be
a fork of the chain and therefore invalid, you must check that the block at this height is that
block before trusting it.

```bash
$ curl http://localhost:3000/api/PKT/pkt/tx/3ca8e8480dbd8a16886c352a958c78d88fcb6cc6e45509511368198e0134fa28
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
        "txid": "3ca8e8480dbd8a16886c352a958c78d88fcb6cc6e45509511368198e0134fa28",
        "size": 369,
        "version": 1,
        "locktime": 0,
        "inputCount": 2,
        "outputCount": 2,
        "value": "1344104419",
        "coinbase": "",
        "firstSeen": "2019-12-23T00:21:07.000Z",
        "dateMs": "1577060508767",
        "blockTime": "2019-12-22T23:21:07.000Z",
        "blockHash": "13255430c58379279671e4486131d3f5b5e8914126ccabc83f600062c123cd16",
        "blockHeight": 189620
}
```

### GET `/api/PKT/pkt/tx/<txid>/coins[/<limit>][/<pageNum>]`
This is a [paged query](#paged-queries) for getting the payments spent and the payments created
by a given transaction. The return value is precisely the same format as
[block/coins](#get___api__chain___network__block__hash__coins___limit_____page___) but there will
be only one txid in the txid list.

```bash
curl http://localhost:3000/api/PKT/pkt/tx/3ca8e8480dbd8a16886c352a958c78d88fcb6cc6e45509511368198e0134fa28/coins
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
	"txids": [
		"3ca8e8480dbd8a16886c352a958c78d88fcb6cc6e45509511368198e0134fa28"
	],
	"inputs": [
		{
			"address": "pLbeSo3Nm4nJvQuXmw1WaWCVdRvNXcMtGe",
			"mintTxid": "012761d482a2f92e7d53f7c557cd144db2d219607dab3e21f0c7412fa0a7916f",
			"mintIndex": 1,
			"state": 26,
			"dateMs": "1577060508768",
			"value": 672055509,
			"script": "dqkUpR6tK8diN8dir5oiBpyLOk1Uw/WIrA==",
			"coinbase": 1,
			"seenTime": "2019-12-22T22:39:37.000Z",
			"mintBlockHash": "f6cc0fc6a178a510664208613cae04c224cf00d8123cd7957ff15f42cb617a36",
			"mintHeight": 189518,
			"mintTime": "2019-12-22T22:39:37.000Z",
			"spentTxid": "3ca8e8480dbd8a16886c352a958c78d88fcb6cc6e45509511368198e0134fa28",
			"spentTxinNum": 0,
			"spentBlockHash": "13255430c58379279671e4486131d3f5b5e8914126ccabc83f600062c123cd16",
			"spentHeight": 189620,
			"spentTime": "2019-12-23T00:21:07.000Z",
			"spentSequence": 4294967295
		},
		{
			"address": "pLbeSo3Nm4nJvQuXmw1WaWCVdRvNXcMtGe",
			"mintTxid": "f8dc664d59164385f3f987653df836a630438977175396c41ac37b625d495520",
			"mintIndex": 64,
			"state": 26,
			"dateMs": "1577060508768",
			"value": 672049283,
			"script": "dqkUpR6tK8diN8dir5oiBpyLOk1Uw/WIrA==",
			"coinbase": 1,
			"seenTime": "2019-12-22T22:40:26.000Z",
			"mintBlockHash": "d88992d062861064efe6ca52dd1bebe48bd2d1edc5033e9823bf09e083883ea5",
			"mintHeight": 189519,
			"mintTime": "2019-12-22T22:40:26.000Z",
			"spentTxid": "3ca8e8480dbd8a16886c352a958c78d88fcb6cc6e45509511368198e0134fa28",
			"spentTxinNum": 1,
			"spentBlockHash": "13255430c58379279671e4486131d3f5b5e8914126ccabc83f600062c123cd16",
			"spentHeight": 189620,
			"spentTime": "2019-12-23T00:21:07.000Z",
			"spentSequence": 4294967295
		}
	],
	"outputs": [
		{
			"address": "p6L3e2vJniVD77o94iyK5DLcUrX73ZxaiJ",
			"mintTxid": "3ca8e8480dbd8a16886c352a958c78d88fcb6cc6e45509511368198e0134fa28",
			"mintIndex": 0,
			"state": 16,
			"dateMs": "1577060508767",
			"value": 1073741824,
			"script": "dqkUCJmfDEJ1ONfsVErdHw86H/ceM1OIrA==",
			"coinbase": 0,
			"seenTime": "2019-12-23T00:21:07.000Z",
			"mintBlockHash": "13255430c58379279671e4486131d3f5b5e8914126ccabc83f600062c123cd16",
			"mintHeight": 189620,
			"mintTime": "2019-12-23T00:21:07.000Z",
			"spentTxid": "",
			"spentTxinNum": 0,
			"spentBlockHash": "",
			"spentHeight": 0,
			"spentTime": "",
			"spentSequence": 0
		},
		{
			"address": "pkt1q2atrr5myhhkxmt3vdx4d4ht6qj2msmm5f8duet",
			"mintTxid": "3ca8e8480dbd8a16886c352a958c78d88fcb6cc6e45509511368198e0134fa28",
			"mintIndex": 1,
			"state": 26,
			"dateMs": "1577060836567",
			"value": 270362595,
			"script": "ABRXVjHTZL3sba4saara3XoElbhvdA==",
			"coinbase": 0,
			"seenTime": "2019-12-23T00:21:07.000Z",
			"mintBlockHash": "13255430c58379279671e4486131d3f5b5e8914126ccabc83f600062c123cd16",
			"mintHeight": 189620,
			"mintTime": "2019-12-23T00:21:07.000Z",
			"spentTxid": "1b42e1e61942dcf4e864129689c691707399dba079182026ccdc46f3d914c121",
			"spentTxinNum": 1,
			"spentBlockHash": "eef2efbc95737531bbced71226e6cc07df72d96fc4992c3c05b7ff984c6d65ea",
			"spentHeight": 189625,
			"spentTime": "2019-12-23T00:27:06.000Z",
			"spentSequence": 4294967295
		}
	],
	"previous": "",
	"next": ""
}
```

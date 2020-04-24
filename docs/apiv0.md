
# API v0
What follows is an explanation of the API version 0 endpoints which this server provides.
If you have not already, you should review the overall
[API documentation](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md)
before delving into the specific v0 endpoints.

# GET /api/status/enabled-chains
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

# GET `/api/<chain>/<network>/valid/<address_number_or_hash>`
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

# GET ```/api/<chain>/<network>/stats/richlist[/<limit>][/<pageNum>]```
This is a [paged query](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#paged-queries),
the maximum allowable limit is 500 results. It provides
balance information for the "richest" addresses known to this block explorer.

The result is in the form as follows, the values of `balance`, `unconfirmed`, `received` and `spent`
are string representatins of numbers in base-10, in order to avoid rounding errors from Jaavscript.
Also the numbers are in the atomic unit of currency (e.g. the Satoshi).

```js
{
  results: Array<{
    address: string,
    balance: string
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
                        "balance": "436625115681516374"
                },
                {
                        "address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
                        "balance": "113021838181350134"
                },
                {
                        "address": "pkt1q3rnwa8jw0ucs2qgxlrm06kfxwljlqxpzr85t9r30jv43fj7j29dquswyxt",
                        "balance": "66155320614582627"
                }
        ],
        "prev": "",
        "next": "/stats/richlist/3/2"
}
```
</details>

# GET `/api/<chain>/<network>/stats/daily-transactions`

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

# GET `/api/<chain>/<network>/address/<address>/`
This query currently returns nothing but an empty array, in the future it may return
some vital statistics for an address.

# GET `/api/<chain>/<network>/address/<address>/balance`
This query gets the [AddrStats_t](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#addrstats)
object for the given address. Details of the fields are explained therein. 

```bash
$ curl http://localhost:3000/api/PKT/pkt/address/pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2/balance
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
    "unconfirmedReceived": "0",
    "confirmedReceived": "303614995782210613",
    "balance": "98063903087371220",
    "spending": "0",
    "spent": "85006797353036390",
    "burned": "120544295341803003",
    "recvCount": 558,
    "mineCount": 371633,
    "spentCount": 98517,
    "balanceCount": 132653,
    "mined24": "1050261289381485"
}
```
</details>

# GET `/api/<chain>/<network>/address/<address>/coins[/<limit>][/<pageNum>]`
This query gets the transactions which paid to and from this address. It is a
[paged query](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#paged-queries)
and because of the combinatorial explosion of "related transactions", no limit greater than 10 is allowed.

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
            "stateTr": 34,
            "dateMs": "1587141411213",
            "value": 417101310,
            "coinbase": 0,
            "voteFor": "",
            "voteAgainst": "",
            "seenTime": "2019-12-22T23:51:53.000Z",
            "mintHeight": 189588,
            "mintTime": "2019-12-22T23:51:53.000Z",
            "spentTxinNum": 1,
            "spentHeight": 189590,
            "spentTime": "2019-12-22T23:52:48.000Z",
            "spentSequence": 4294967295,
            "mintBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
            "spentTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
            "spentBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55"
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
            "stateTr": 34,
            "dateMs": "1587143345974",
            "value": 1073741824,
            "coinbase": 0,
            "voteFor": "",
            "voteAgainst": "",
            "seenTime": "2019-12-22T23:51:53.000Z",
            "mintHeight": 189588,
            "mintTime": "2019-12-22T23:51:53.000Z",
            "spentTxinNum": 0,
            "spentHeight": 307032,
            "spentTime": "2020-03-11T12:36:53.000Z",
            "spentSequence": 4294967295,
            "mintBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
            "spentTxid": "5fbd2a6dfa713a3755eaf42d149b80ac54e5eeb3e7bbed3b853cb42098c947dc",
            "spentBlockHash": "471c4568e7fa118dd7205cecb661dd43333073d170bcf88b9d7e7c01c006b738"
        },
        {
            "address": "pkt1qqqpseuqdmfdxd9lncr6jxzvfaj8rudkd9kvujr",
            "mintTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
            "mintIndex": 0,
            "stateTr": 34,
            "dateMs": "1587141411213",
            "value": 417101310,
            "coinbase": 0,
            "voteFor": "",
            "voteAgainst": "",
            "seenTime": "2019-12-22T23:51:53.000Z",
            "mintHeight": 189588,
            "mintTime": "2019-12-22T23:51:53.000Z",
            "spentTxinNum": 1,
            "spentHeight": 189590,
            "spentTime": "2019-12-22T23:52:48.000Z",
            "spentSequence": 4294967295,
            "mintBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
            "spentTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
            "spentBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55"
        }
	],
	"fundingTxInputs": [
        {
            "address": "pNZrb6dHks4ALp9kv9GwxM4RQFXd79VoZQ",
            "mintTxid": "7a73533cfbb2ffcba8bc357917a34f6ed52275a5f4d25aca0c4e5e8d2009db87",
            "mintIndex": 71,
            "stateTr": 34,
            "dateMs": "1587141411213",
            "value": 978945867,
            "coinbase": 1,
            "voteFor": "",
            "voteAgainst": "",
            "seenTime": "2019-12-22T22:09:23.000Z",
            "mintHeight": 189487,
            "mintTime": "2019-12-22T22:09:23.000Z",
            "spentTxinNum": 0,
            "spentHeight": 189588,
            "spentTime": "2019-12-22T23:51:53.000Z",
            "spentSequence": 4294967295,
            "mintBlockHash": "62f3f8cc643e036223cfa9dba1d1e52d7b916767988b5912d8ab17f0d6ab8481",
            "spentTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
            "spentBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8"
        },
        {
            "address": "pkt1qstcqkl5nzn73wge32rjf8rcx086g4j68t70d46",
            "mintTxid": "269a517568fb68605a4c42ff64d65f8f9e6c2457030e04eca8850131ca2718c2",
            "mintIndex": 0,
            "stateTr": 34,
            "dateMs": "1587141411213",
            "value": 511897560,
            "coinbase": 0,
            "voteFor": "",
            "voteAgainst": "",
            "seenTime": "2019-12-22T23:48:06.000Z",
            "mintHeight": 189586,
            "mintTime": "2019-12-22T23:48:06.000Z",
            "spentTxinNum": 1,
            "spentHeight": 189588,
            "spentTime": "2019-12-22T23:51:53.000Z",
            "spentSequence": 4294967295,
            "mintBlockHash": "f9fff164b16e3dbfe6df57d30a037f49e807a8544c01353bbea835d2c2e6622d",
            "spentTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
            "spentBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8"
        }
	],
	"spendingTxOutputs": [
        {
            "address": "pNVUbaBwDwLFLj6UHSZuKDGxV7tXnqyzJa",
            "mintTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
            "mintIndex": 1,
            "stateTr": 16,
            "dateMs": "1587141411212",
            "value": 1073741824,
            "coinbase": 0,
            "voteFor": "",
            "voteAgainst": "",
            "seenTime": "2019-12-22T23:52:48.000Z",
            "mintHeight": 189590,
            "mintTime": "2019-12-22T23:52:48.000Z",
            "spentTxinNum": 0,
            "spentHeight": 0,
            "spentTime": "",
            "spentSequence": 0,
            "mintBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55",
            "spentTxid": "",
            "spentBlockHash": ""
        },
        {
            "address": "pkt1q5wq8e6zpqk2l8x2nypjppugy7nnjhnrr8dqk7n",
            "mintTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
            "mintIndex": 0,
            "stateTr": 34,
            "dateMs": "1587141411213",
            "value": 323217867,
            "coinbase": 0,
            "voteFor": "",
            "voteAgainst": "",
            "seenTime": "2019-12-22T23:52:48.000Z",
            "mintHeight": 189590,
            "mintTime": "2019-12-22T23:52:48.000Z",
            "spentTxinNum": 1,
            "spentHeight": 189592,
            "spentTime": "2019-12-22T23:54:23.000Z",
            "spentSequence": 4294967295,
            "mintBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55",
            "spentTxid": "918f463f650e94f241b19ace04baf3d2d1b3bb2e118767b09e33700695f155bc",
            "spentBlockHash": "6930ba944295369d687de338abd3681ea45a80274f5702239325a0701d0b2b2b"
        }
	],
    "spendingTxInputs": [
        {
            "address": "pNZrb6dHks4ALp9kv9GwxM4RQFXd79VoZQ",
            "mintTxid": "98ed1391d5492ff75ac0354cc2f4ec274a43f6e8821f799fd0e0744b339481fe",
            "mintIndex": 40,
            "stateTr": 34,
            "dateMs": "1587141411213",
            "value": 979858674,
            "coinbase": 1,
            "voteFor": "",
            "voteAgainst": "",
            "seenTime": "2019-12-22T22:09:43.000Z",
            "mintHeight": 189489,
            "mintTime": "2019-12-22T22:09:43.000Z",
            "spentTxinNum": 0,
            "spentHeight": 189590,
            "spentTime": "2019-12-22T23:52:48.000Z",
            "spentSequence": 4294967295,
            "mintBlockHash": "043f40643bb932c25684a6c42d93e9fd942880fd626c73694730e256e1eed9e2",
            "spentTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
            "spentBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55"
        },
        {
            "address": "pkt1qqqpseuqdmfdxd9lncr6jxzvfaj8rudkd9kvujr",
            "mintTxid": "bd9f7141fe42ccea9b0d093ed60dd3c94d7153011675a9befcbc298057cb684f",
            "mintIndex": 0,
            "stateTr": 34,
            "dateMs": "1587141411213",
            "value": 417101310,
            "coinbase": 0,
            "voteFor": "",
            "voteAgainst": "",
            "seenTime": "2019-12-22T23:51:53.000Z",
            "mintHeight": 189588,
            "mintTime": "2019-12-22T23:51:53.000Z",
            "spentTxinNum": 1,
            "spentHeight": 189590,
            "spentTime": "2019-12-22T23:52:48.000Z",
            "spentSequence": 4294967295,
            "mintBlockHash": "6ace343ef4df6ffb8a217e9724c141cb4462f73f7926873f79a5023c7318d2e8",
            "spentTxid": "d9dfbc5e4e5ed96cbe35cebea792150ac3806ae9ca0955a52d32d8be91e0edac",
            "spentBlockHash": "30553edf8a04a0ee4f53ce6e2a7ee21dd9bc875ffdf8f6102b703b641abf0a55"
        }
    ],
	"prev": "",
	"next": "/address/pkt1qqqpseuqdmfdxd9lncr6jxzvfaj8rudkd9kvujr/coins/1/2"
}
```
</details>

# GET `/api/<chain>/<network>/block?<PARAMS>`

This query gets metadata from the main chain of blocks, the order is always decending by height.
The PARAMS field must contain a `limit` parameter which specifies the maximum number of blocks
that will be returned. The `since` field allows skipping some blocks in order to implement paging.

The return value is an array of
[Block_t](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#block) entries.

Example:

```bash
$ curl 'http://localhost:3000/api/PKT/pkt/block?limit=2&since=50000'
```

<details>
<summary><b>Response</b></summary>
<br>

```json
[
    {
        "hash": "7fb3be78d3507140dfc49f985a0dcbd17884e1e606815dc73d226424f3bd7e14",
        "height": 49999,
        "version": 536870912,
        "size": 6447,
        "merkleRoot": "e6f9469f8188818ef4c4c5325afbcfc10c09c37a527afe22277ffa8dc5fe783d",
        "time": "2019-09-22T19:13:47.000Z",
        "nonce": 474711309,
        "bits": 520276047,
        "difficulty": 5.75031121,
        "previousBlockHash": "404ff0029ad3b5fc904d1632773583286f5284a4389a6b75587a8c08b98985f1",
        "transactionCount": 1,
        "pcAnnCount": "1108",
        "pcAnnDifficulty": 1024.00036621,
        "pcBlkDifficulty": 2878995.71808917,
        "pcVersion": 0,
        "dateMs": "1587140537638",
        "networkSteward": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
        "blocksUntilRetarget": 401,
        "retargetEstimate": 1.075062346060397
    },
    {
        "hash": "404ff0029ad3b5fc904d1632773583286f5284a4389a6b75587a8c08b98985f1",
        "height": 49998,
        "version": 536870912,
        "size": 6567,
        "merkleRoot": "865da0a5f116e4973f1329fb30bc9f31b72d5eda5d210df1503866beb923ad96",
        "time": "2019-09-22T19:13:43.000Z",
        "nonce": 1610749951,
        "bits": 520276047,
        "difficulty": 5.75031121,
        "previousBlockHash": "1aedf903f1cd54d889a779993e999426c850f53ee9e89fb305d28c45c1aab803",
        "transactionCount": 1,
        "pcAnnCount": "4909",
        "pcAnnDifficulty": 136.49999186,
        "pcBlkDifficulty": 4874758.35596226,
        "pcVersion": 0,
        "dateMs": "1587140537638",
        "networkSteward": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
        "blocksUntilRetarget": 402,
        "retargetEstimate": 1.0746758608913622
    }
]
```
</details>

# GET `/api/<chain>/<network>/block/tip`

This is simply an alias for `/api/<chain>/<network>/block/?limit=1`

# GET `/api/<chain>/<network>/block/<number_or_hash>`

This query results in a single block type entry, it can be specified by number
(i.e. main chain height) or by hash.

The result is a simple [Block_t](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#block) type value.

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
    "pcAnnCount": "434",
    "pcAnnDifficulty": 2048.4998779,
    "pcBlkDifficulty": 19323.54378987,
    "pcVersion": 0,
    "dateMs": "1587140429910",
    "networkSteward": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
    "blocksUntilRetarget": 2015,
    "retargetEstimate": 0
}
```
</details>

# GET `/api/<chain>/<network>/block/<hash>/coins[/<limit>][/<page>]`

This is a query to get all of the payments related to the transactions in a particular block.
This is a standard [paged query](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#paged-queries)

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
* **prev**: The [paged query](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#paged-queries)
previous page
* **next**: The [paged query](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#paged-queries)
next page

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
                "stateTr": 34,
                "dateMs": "1587141288669",
                "value": 3582061445120,
                "coinbase": 1,
                "voteFor": "",
                "voteAgainst": "",
                "seenTime": "2019-08-20T02:56:48.000Z",
                "mintBlockHash": "f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd",
                "mintHeight": 1,
                "mintTime": "2019-08-20T02:56:48.000Z",
                "spentTxid": "598794e24ba5cd0074d29574ea7f0c85dcf46d2867da10ebcadc6e8d4fa0e63a",
                "spentTxinNum": 8,
                "spentBlockHash": "9ae28c808eb3bd6d2b3d826c482047cb81c61ed92703447f2886782477356dbf",
                "spentHeight": 176079,
                "spentTime": "2019-12-13T19:24:40.000Z",
                "spentSequence": 4294967295,
                "prevState": "block",
                "currentState": "spent"
            },
            {
                "address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
                "mintTxid": "7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03",
                "mintIndex": 1,
                "stateTr": 42,
                "dateMs": "1587146297813",
                "value": 891146993664,
                "coinbase": 2,
                "voteFor": "",
                "voteAgainst": "",
                "seenTime": "2019-08-20T02:56:48.000Z",
                "mintBlockHash": "f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd",
                "mintHeight": 1,
                "mintTime": "2019-08-20T02:56:48.000Z",
                "spentTxid": "",
                "spentTxinNum": 0,
                "spentBlockHash": "",
                "spentHeight": 0,
                "spentTime": "",
                "spentSequence": 0,
                "prevState": "block",
                "currentState": "burned"
            },
            {
                "address": "script:ajAJ+REC/w8AIH7k4dPmy9DAY6bkv5qDVJ9srkNKLAb4WX5mfU0lcjWzsgEAAAAAAAA=",
                "mintTxid": "7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03",
                "mintIndex": 2,
                "stateTr": 16,
                "dateMs": "1587140429935",
                "value": 0,
                "coinbase": 1,
                "voteFor": "",
                "voteAgainst": "",
                "seenTime": "2019-08-20T02:56:48.000Z",
                "mintBlockHash": "f79cf93e02e51e2458054cd4de9c87d8c911033a7bc2c1b495957e1b652f04cd",
                "mintHeight": 1,
                "mintTime": "2019-08-20T02:56:48.000Z",
                "spentTxid": "",
                "spentTxinNum": 0,
                "spentBlockHash": "",
                "spentHeight": 0,
                "spentTime": "",
                "spentSequence": 0,
                "prevState": "nothing",
                "currentState": "block"
            }
        ],
        "prev": "",
        "next": ""
}
```
</details>

# GET `/api/<chain>/<network>/tx/?blockHash=<hash>`
This query gets the basic transaction metadata related to all transactions included in a given
block.

The result format is an array of
[Transaction_t](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#transaction)

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
        "vsize": 369,
        "version": 1,
        "locktime": 0,
        "inputCount": 2,
        "outputCount": 2,
        "value": "1344104419",
        "coinbase": "",
        "firstSeen": "2019-12-23T00:21:07.000Z",
        "dateMs": "1587141411212"
    },
    {
        "txid": "9f3c0dabb7f38c51abc8129dbcc522865cb41e27f7c0e346b0b677bd6871a2ba",
        "size": 3297,
        "vsize": 3270,
        "version": 1,
        "locktime": 0,
        "inputCount": 0,
        "outputCount": 92,
        "value": "4025887595571",
        "coinbase": "03b4e402000b2f503253482f706b74642f",
        "firstSeen": "2019-12-23T00:21:07.000Z",
        "dateMs": "1587141411212"
    },
    {
        "txid": "a11b24f27f48c56c0488fcb64ce1c01ffe0207dbb9db5bd68b9a8baf7de8034f",
        "size": 373,
        "vsize": 291,
        "version": 1,
        "locktime": 0,
        "inputCount": 2,
        "outputCount": 2,
        "value": "1864964756",
        "coinbase": "",
        "firstSeen": "2019-12-23T00:21:07.000Z",
        "dateMs": "1587141411212"
    }
]
```
</details>

# GET `/api/PKT/pkt/tx/<txid>`
This endpoint gets a
([TransactionDetail_t](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#transactiondetail))
structure, 

```bash
$ curl http://localhost:3000/api/PKT/pkt/tx/1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
    "txid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
    "size": 1858,
    "vsize": 1687,
    "version": 1,
    "locktime": 0,
    "inputCount": 12,
    "outputCount": 2,
    "value": "546791795037",
    "coinbase": "",
    "firstSeen": "2020-04-18T07:08:55.000Z",
    "dateMs": "1587193751256",
    "blockTime": "2020-04-18T07:08:55.000Z",
    "blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
    "blockHeight": 360272,
    "input": [
        {
            "address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
            "value": "455662474290",
            "spentcount": 10
        },
        {
            "address": "pkt1qv7l755avsvddcs93xcmqaf6dsfc6hvzjdul3vz",
            "value": "45566364210",
            "spentcount": 1
        },
        {
            "address": "pkt1qwhh24kaaxgmfzhx42shqvfcyh7y6u6fdlh99td",
            "value": "45562958240",
            "spentcount": 1
        }
    ],
    "output": [
        {
            "address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
            "value": "536870912000",
            "spentcount": 0
        },
        {
            "address": "pkt1qrdwmcsayzx7rzrvdcjm75cryqlsedmhuk0y65c",
            "value": "9920883037",
            "spentcount": 1
        }
    ]
}
```

As per the behavior of
[CoinAggregate_t](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#coinaggregate),
you can see that the address
`pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK` sourced their payment of `455662474290` units from 10
different previous transactions. while the address `pkt1qv7l755avsvddcs93xcmqaf6dsfc6hvzjdul3vz`
sourced their contribution of `45566364210` units from only one. Also you can that the recipient
address `pkt1qrdwmcsayzx7rzrvdcjm75cryqlsedmhuk0y65c` has spent the coins they received while the
recipient `pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f` has not.

</details>

# GET `/api/PKT/pkt/tx/<txid>/coins[/<limit>][/<pageNum>]`
This is a [paged query](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#paged-queries)
for getting each of the individual inputs spent and the
outputs created by a given transaction. The return value is precisely the same format as
[block/coins](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md#get-apichainnetworkblockhashcoinslimitpage) but there will
be only one txid in the txid list. Here you can see each of the 10 individual transactions which
were spent by `pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK` where in the previous example.

```bash
curl http://localhost:3000/api/PKT/pkt/tx/1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76/coins
```

<details>
<summary><b>Response</b></summary>
<br>

```json
{
	"txids": [
		"1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76"
	],
	"inputs": [
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "66f2f6b8360333e388fbb9ff279b8bb5b01c3c67153b638256f06ffcf59460a2",
			"mintIndex": 97,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45568058964,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-28T17:57:36.000Z",
			"mintBlockHash": "9a9486656366ed8da050583e7ad8326394c421cbff13e168ec324f48b22227cf",
			"mintHeight": 243167,
			"mintTime": "2020-01-28T17:57:36.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 0,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "b3d94156b0876780dad0dd960526ff045133cb3c200761af93c1ee2ece3df96f",
			"mintIndex": 57,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45568056918,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-28T21:13:56.000Z",
			"mintBlockHash": "d90deb885e9d91870979455cff7956928bb5c58e9a6b772a1c636486d828c5a5",
			"mintHeight": 243376,
			"mintTime": "2020-01-28T21:13:56.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 1,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "8b9a639c2b6b883ce3b4ea8bb3dc2adc660e3a0dec65321781909b92b2eee7e9",
			"mintIndex": 20,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45567929741,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-28T21:19:30.000Z",
			"mintBlockHash": "84bb661166c64cc721ad4ba16c0a4f875e7b53c56e4446255aecc431706b9b6e",
			"mintHeight": 243381,
			"mintTime": "2020-01-28T21:19:30.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 2,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "5c50b1cc2b939fdfe549e1a4639f6310ec5459ea40e5258d2c71115c3605cc58",
			"mintIndex": 95,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45567103152,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-28T21:13:32.000Z",
			"mintBlockHash": "ffc87457b925a074459e198817888ef3fe8808eb04db4d7513b61148efacbc3f",
			"mintHeight": 243375,
			"mintTime": "2020-01-28T21:13:32.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 3,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "74b8ffa102e629c920f49901d021d3bdcd7f037abf2f99b4b0696670452f097f",
			"mintIndex": 84,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45566995436,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-28T15:16:09.000Z",
			"mintBlockHash": "5eefb34f76d16d3e01a7861985c340bde1161ec79d2b09b995f7059985837f2e",
			"mintHeight": 242994,
			"mintTime": "2020-01-28T15:16:09.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 4,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pkt1qv7l755avsvddcs93xcmqaf6dsfc6hvzjdul3vz",
			"mintTxid": "860ed8565a8315c5a58cdd7c191cc68e0027c7f9b4c0570ce72af9afd70d239d",
			"mintIndex": 0,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45566364210,
			"coinbase": 0,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-04-18T06:39:24.000Z",
			"mintBlockHash": "8f19cb154ac1108aa1954585a86255b962861ca0e7f78deec470e53e0e7957d2",
			"mintHeight": 360248,
			"mintTime": "2020-04-18T06:42:34.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 5,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "345c2e0a297b104088d72786c2fbc2981fc72a921f6d811eecc1e23711009bbf",
			"mintIndex": 12,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45565685328,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-28T15:15:38.000Z",
			"mintBlockHash": "4a66e45beeeb3b57b314e720624c40e61e77b7f345fc3e287fefb229f5ab4b92",
			"mintHeight": 242993,
			"mintTime": "2020-01-28T15:15:38.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 6,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "1f86f26221f82ecaee9ac0331495f05f5dd06a3fa8bbb740c72fa871d1f9844b",
			"mintIndex": 25,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45565190016,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-28T21:38:04.000Z",
			"mintBlockHash": "1eeb546273e28d405d28d58cef08c49ec7f5920530a3f184d069ddc5eff6cc0c",
			"mintHeight": 243399,
			"mintTime": "2020-01-28T21:38:04.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 7,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "b4deb2fb1e8db699989557b8ded5e3a351fab3750f9d7fb5935562aa060ae805",
			"mintIndex": 41,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45565074705,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-28T21:40:26.000Z",
			"mintBlockHash": "e783088f17e00ba9a07b31bc05e8b9a43e8553d65a9d0edc5691036ccbeeae5b",
			"mintHeight": 243403,
			"mintTime": "2020-01-28T21:40:26.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 8,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "5ca3ce90aa41b726c1a4f910df84bbe2f45c7f046a34acef392caf7d0334138c",
			"mintIndex": 73,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45564385542,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-29T02:48:53.000Z",
			"mintBlockHash": "82126dccf2e653c9df818808084e290b35b007da72cfbc5812177f398f56751a",
			"mintHeight": 243733,
			"mintTime": "2020-01-29T02:48:53.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 9,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "bd7198267a92a75057306ad579406dc3ea56c6d46fe9b5c875e1c22dccc5d3bf",
			"mintIndex": 88,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45563994488,
			"coinbase": 1,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-01-29T02:49:11.000Z",
			"mintBlockHash": "e26205b105dcf15f9d356459572020e4ab8ae41348f8ebe4acd5187cc311f246",
			"mintHeight": 243734,
			"mintTime": "2020-01-29T02:49:11.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 10,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		},
		{
			"address": "pkt1qwhh24kaaxgmfzhx42shqvfcyh7y6u6fdlh99td",
			"mintTxid": "be25a1264da8e9301b968e6cc288ba256c1008674bc0b07c9f2ad4cbf8f64100",
			"mintIndex": 0,
			"stateTr": 35,
			"dateMs": "1587193751257",
			"value": 45562958240,
			"coinbase": 0,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-04-17T21:00:03.000Z",
			"mintBlockHash": "b197f24d516035529f4a671a5457dc062f1d0d402c1df34a3d63a000aa48d483",
			"mintHeight": 359693,
			"mintTime": "2020-04-17T21:00:12.000Z",
			"spentTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"spentTxinNum": 11,
			"spentBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"spentHeight": 360272,
			"spentTime": "2020-04-18T07:08:55.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		}
	],
	"outputs": [
		{
			"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
			"mintTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"mintIndex": 0,
			"stateTr": 17,
			"dateMs": "1587193751256",
			"value": 536870912000,
			"coinbase": 0,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-04-18T07:07:03.000Z",
			"mintBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"mintHeight": 360272,
			"mintTime": "2020-04-18T07:08:55.000Z",
			"spentTxid": "",
			"spentTxinNum": 0,
			"spentBlockHash": "",
			"spentHeight": 0,
			"spentTime": "",
			"spentSequence": 0,
			"prevState": "mempool",
			"currentState": "block"
		},
		{
			"address": "pkt1qrdwmcsayzx7rzrvdcjm75cryqlsedmhuk0y65c",
			"mintTxid": "1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76",
			"mintIndex": 1,
			"stateTr": 35,
			"dateMs": "1587256293348",
			"value": 9920883037,
			"coinbase": 0,
			"voteFor": "",
			"voteAgainst": "",
			"seenTime": "2020-04-18T07:07:03.000Z",
			"mintBlockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"mintHeight": 360272,
			"mintTime": "2020-04-18T07:08:55.000Z",
			"spentTxid": "9a9a9d6c98142267f21f0e1bbd97adab43a3850acbd2c6e827a3dbcd6c4eb44a",
			"spentTxinNum": 38,
			"spentBlockHash": "4e72138f8cfeadc30abe17022d690e7e2cb9940eafd818ae707e0faa287c562c",
			"spentHeight": 361232,
			"spentTime": "2020-04-19T00:30:59.000Z",
			"spentSequence": 4294967295,
			"prevState": "spending",
			"currentState": "spent"
		}
	],
	"prev": "",
	"next": ""
}
```
</details>
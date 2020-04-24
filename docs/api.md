# API
This is a generic document about the overarching aspects of the API which transcend version 0 and
version 1.

## Dates
This explorer often aggregated information by day, whenever this is done, the boundary between
one day and another is always midnight UTC. When dates are provided, they are provided in the
form `2020-04-23T00:00:00.000Z` which indicates that the date is in the UTC timezone and allows
Javascript to format the date properly in the frontend.

## Paged Queries
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

## Datastructures
These datastructures are common to both API versions 0 and 1. There are 5 key datastructures:

* **AddrStats** a set of basic statistics for an address
* **Block** a description of a block
* **Transaction** a simplistic description of a transaction, containing only what is stored in the db
* **TransactionDetail** a more expansive description of a transaction using additional data sourced
from other database tables
  * **CoinAggregate** a sub-object contained within the **TransactionDetail** structure which explains
  who paid into and who was paid by a transaction.
* **Coins** a highly detailed description of a payment which was made by a transaction, this is the
beating heart of the database and is used to build up most of the other useful data.

### AddrStats
The AddrStats object consists of the following fields:

* **unconfirmedReceived**: `string` The number of units which were received in a free transaction not
in a block.
* **confirmedReceived**: `string` The number of units which were received (including those spent or burned)
* **balance**: `string` The number of units which were received minus those spent or burned
* **spent**: `string` The number of units which were received and then spent
* **burned**: `string` The number of units which were burned (in case the chain is not PKT, this will
always be zero)
* **recvCount**: `number` The number of transactions which paid this address, sans mining payouts
* **mineCount**: `number` The number of mining payouts which paid this address
* **spentCount**: `number` The number of transactions where this address made payments
* **balanceCount**: `number` The number of unspent transaction outputs which exist for this address
* **mined24**: `string` The number of units of currency which have been mined by this address in the past 24 hours

The typescript/flow format of this data is as follows:

```js
export type AddrStats_t = {
  unconfirmedReceived: string,
  confirmedReceived: string,
  balance: string,
  spent: string,
  burned: string,
  recvCount: number,
  mineCount: number,
  spentCount: number,
  balanceCount: number,
  mined24: string,
}
```

#### Example

https://pkt.cash/api/v1/PKT/pkt/address/pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2

```json
{
	"unconfirmedReceived": "0",
	"confirmedReceived": "303822882552892309",
	"balance": "98040804557295380",
	"spending": "0",
	"spent": "85006797353036390",
	"burned": "120775280642560539",
	"recvCount": 558,
	"mineCount": 371921,
	"spentCount": 98517,
	"balanceCount": 132653,
	"mined24": "1017057152397603"
}
```

### Block
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
* **pcAnnCount**: `string` If the blockchain is using PacketCrypt proof of work, this will be
a base-10 string showing the number of announcements in the block.
* **pcAnnDifficulty**: `number` If the blockchain is using PacketCrypt proof of work, this will be a
floating point number representing the target difficulty of the announcements in this block.
* **pcBlkDifficulty**: `number` If the blockchain is using PacketCrypt proof of work, this will be a
floating point number representing the target difficulty for the block miner when they mined this block.
* **pcVersion**: `number` If the blockchain is using PacketCrypt proof of work, this will be the version
of PacketCrypt which is being used.
* **networkSteward**: `string` If the blockchain is using a Network Steward system, this will be the
address of the current Network Steward.
* **blocksUntilRetarget**: `number` The number of blocks until the next difficulty re-target.
* **retargetEstimate**: `number` A number which when multiplied by the current difficulty gives the
expected next difficulty. In the first difficulty period, this is unknown and will be zero.

The typescript/flow format of this data is as follows:

```js
export type Block_t = {
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
  dateMs: string,
  pcAnnCount?: string,
  pcAnnDifficulty?: number,
  pcBlkDifficulty?: number,
  pcVersion?: number,
  networkSteward?: string,
  blocksUntilRetarget: number,
  retargetEstimate: number,
};
```

#### Example

```bash
curl http://localhost:3000/api/v1/PKT/pkt/block/4e72138f8cfeadc30abe17022d690e7e2cb9940eafd818ae707e0faa287c562c ; echo
```

```json
{
	"hash": "4e72138f8cfeadc30abe17022d690e7e2cb9940eafd818ae707e0faa287c562c",
	"height": 361232,
	"version": 536870912,
	"size": 252464,
	"merkleRoot": "e373dbf8e3d7d82f4d816e5c9a81430ec3a3e0e33449e17b4e1846b2ccda0575",
	"time": "2020-04-19T00:30:59.000Z",
	"nonce": 629818594,
	"bits": 489353891,
	"difficulty": 24415.10409727,
	"previousBlockHash": "4f910bd631cdef17ffbc49aa048eaad026c8e7e20fc63d0f1bb314202d4645a1",
	"transactionCount": 32,
	"pcAnnCount": "729456",
	"pcAnnDifficulty": 7.99999905,
	"pcBlkDifficulty": 61183953.63000389,
	"pcVersion": 2,
	"dateMs": "1587256293339",
	"networkSteward": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
	"blocksUntilRetarget": 1648,
	"retargetEstimate": 0.9533194307507606
}
```

### Transaction
A transaction data structure represents a transaction in the blockchain, it contains only
the metadata of the transaction, not any of the inputs or outputs, it also does not contain
any information about whether the transaction was accepted in a block or not.

The transaction object consists of the following fields:

* **txid**: `string` The hash of the transaction, used as it's identifier
* **size**: `number` The number of bytes of the transaction *including segwit witnesses*
* **vsize**: `number` The [Virtual Size](https://en.bitcoin.it/wiki/Weight_units) of the transaction,
with size discounted for the segwit data.
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
export type Transaction_t = {
  txid: string,
  size: number,
  vsize: number,
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

#### Example
API v1 always returns a [TransactionDetail](#transactiondetail) object so the only way to get a
**Transaction** object is by using API v0 `tx?blockhash=` query.

```bash
curl http://localhost:3000/api/PKT/pkt/tx?blockHash=4e72138f8cfeadc30abe17022d690e7e2cb9940eafd818ae707e0faa287c562c ; echo
```

```json
{
    "txid": "0baa7e28b236c1d440213efbc44036e075d083579fcdb83878726607a8dfcdaa",
    "size": 8542,
    "vsize": 5221,
    "version": 1,
    "locktime": 0,
    "inputCount": 57,
    "outputCount": 2,
    "value": "546092346496",
    "coinbase": "",
    "firstSeen": "2020-04-19T00:30:59.000Z",
    "dateMs": "1587256293347"
}
```

### TransactionDetail
The TransactionDetail structure is an extension of [Transaction_t](#transaction) with additional fields.

Additional fields include:
* **blockTime** `string` If the transaction is in a block, this is a string representation of the
Javascript date declared in the block
* **blockHash** `string` If the transaction is in a block, this is the hash of the most recent valid
block to include the transaction
* **blockHeight** `number` If the transaction is in a block, this is the the *declared height* of the
block. Caution: the block still may be an orphan and therefore invalid, you must check that
the block at this height is that block before trusting it.
* **input** `Array<CoinAggregate_t>` An array of inputs, aggregated by address in order to show
which addresses paid into the transaction.
* **output** `Array<CoinAggregate_t>` An array of outputs from the transaction.

#### CoinAggregate
The CoinAggregate_t object is a simplified representation of the inputs and outputs to a transaction.
This structure allows a simple way to display of each of the addresses which paid in to a transaction
without showing many entries for a single address, even if the transaction in question actually
sourced coins from many different transactions.

CoinAggregate has the following fields:
* **address** `string` The address which is paid from or to
* **value** `string` The base-10 value of the input or output, if it is an aggregated input then it
is the sum of all inputs for the given address.
* **spentcount** `number` This has a different meaning depending on whether the CoinAggregate is an
input or an output. In an input, it is the number of different transactions which were aggregated
together and in an output, this is either 0 or 1 depending on whether the output has been spent by
the downstream recipient.

```js
export type CoinAggregate_t = {
    address: string,
    value: string,
    spentcount: number,
};
export type TransactionDetail_t = Transaction_t & {
    blockTime?: string,
    blockHash?: string,
    blockHeight?: number,
    input: Array<CoinAggregate_t>,
    output: Array<CoinAggregate_t>,
};
```

#### Example

```bash
curl http://localhost:3000/api/v1/PKT/pkt/tx/1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76 ; echo
```

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

### Coins
The coins data structure represents a transaction output which may or may not have been spent.
Unlike the Transaction data structure, this data structure does contain information about whether
the transaction was actually included in a block, and if it was -- whether it was subsequently
spent.

Fields of the coins data structure include:

* **address**: `string` The address that was paid to, if the script cannot be decoded as an address
then this field contains `script:` followed by the
[ScriptPubKey](https://en.bitcoin.it/wiki/Transaction#Output) itself in base-64 encoding.
if [the payment is not to an address](https://en.bitcoin.it/wiki/Contract) then empty string
* **mintTxid**: `string` The transaction id of the transaction where this output was placed
* **mintIndex**: `number` The zero-based output number of this transaction output
* **stateTr**: `number` The state transition of this payment, see below for more information
* **prevState**: `string` A decoding of the previous state of the transaction from **stateTr**, one
of `nothing`, `mempool`, `block`, `spending`, `spent`, or `burned`.
* **currentState**: `string` A decoding of the current state of the transaction from **stateTr**, one
of `mempool`, `block`, `spending`, `spent`, or `burned`.
* **dateMs**: `string` This is an internal number used by the database for versioning, it represents
the number of milliseconds since the [UNIX Epoch](https://en.wikipedia.org/wiki/Unix_time) which is
the time when the entry was most recently inserted or updated. It is a base-10 string representation
of a number.
* **value**: `number` The number of atomic units (e.g. Satoshis) which the transaction transfers.
* **coinbase**: `number` One if the output is a coinbase payment, two if the output is a payment of a
[network steward](#network-steward) funding payment. Zero for any non-coinbase transaction.
* **voteFor**: `string` If this transaction output contains a Network Steward vote, then this will
be the address which is being voted for, otherwise empty string. **NOTE**: It is possible to vote
for, or against, or both.
* **voteAgainst**: `string` If this transaction output contains a Network Steward vote, then this will
be the address which is being voted against, otherwise empty string.
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

#### Example

```bash
curl http://localhost:3000/api/v1/PKT/pkt/tx/1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76/detail ; echo
```

```json
{
    "address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
    "mintTxid": "66f2f6b8360333e388fbb9ff279b8bb5b01c3c67153b638256f06ffcf59460a2",
    "mintIndex": 97,
    "dateMs": "1587193751257",
    "value": "45568058964",
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
}
```

#### About State
The **stateTr** field is an important field which explains the current state of a payment. There are
6 possible states and for each state there are 6 possible previous states, making for a total of
36 possible values of the stateTr field. The layout of the stateTr field contains two values, current
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

##### State types

* **nothing**: `0` This should only exist as a previous state, never as a current state, it means
that previously the transaction has not been seen in any form.
* **mempool**: `1` This state indicates that the transation has been seen, but it has not been
minted in a block yet.
* **block**: `2` This state indicates that the transation is minted in a block but it is
has not yet been spent.
* **spending**: `3` This state indicates that there is an unconfirmed transaction which will spend
this money.
* **spent**: `4` This state indicates that the coins have been spent and the spending
transaction has landed in a block.
* **burned**: `5` this is a state specific to the PKT blockchain which has a Network Steward,
coins which are generated for the Network Steward enter this state if they have not been
transferred within 3 months (exactly 129600 blocks).

##### Example

The state `34` in binary is represented as `00100010`, breaking this into unused, current state
and previous state, we get `[ 00, 100, 010 ]`, parsing the current state and previous state as
integers, we get `[ 4, 2 ]`, therefore state number 34 is coins which have been **spent**, but
previously they were in the **block** state. In some cases, the **prevState** and **currentState**
*synthetic fields* are present which display a decoding of the **stateTr** field.

The following query will show examples of a spent payment as well as one which was burned:

```bash
curl http://localhost:3000/api/PKT/pkt/tx/7b1e75ea4a52ac6a84580a5627cbd08be756e9c209837c3ba89798d33cb53a03/coins
```

An example of a payment which has already been spent is as follows:

```json
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
```

An example of a transaction which has not been spent is as follows (if you observe closely,
you will notice that this transaction is now in the state **burned** and therefore it cannot
be spent)

```json
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
```

The flow/typescript representation of the payment is as follows:

```js
export type Coins_t = {
  address: string,
  mintTxid: string,
  mintIndex: number,
  stateTr: number,
  dateMs: string,
  value: number,
  coinbase: number,
  voteFor: string,
  voteAgainst: string,
  seenTime: string,
  mintBlockHash: string,
  mintHeight: number,
  mintTime: string,
  spentTxid: string,
  spentTxinNum: number,
  spentBlockHash: string,
  spentHeight: number,
  spentTime: string,
  spentSequence: number,
  prevState: 'nothing' | 'mempool' | 'block' | 'spending' | 'spent' | 'burned',
  currentState: 'mempool' | 'block' | 'spending' | 'spent' | 'burned',
};
```

## Network Steward
The Network Steward is an institution of the PKT blockchain, by consensus rule it receives exacly
`51/256` of each new block payout. The network steward is subject to 2 additional consensus rules:

1. The address receiving the network steward payout can be changed by a proof-of-stake based voting
process.
2. The payments to the network steward address must be transacted within 3 months or else they will
become nolonger spendable. The exact number of blocks before a NS payment burns is `129600` blocks.

When using this explorer with a blockchain other than PKT, you need not worry about the Network
Steward infrastructure.

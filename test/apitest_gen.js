/*@flow*/
/*::
// SPDX-License-Identifier: MIT
export type AddrStats_t = {
  unconfirmedReceived: string,
  confirmedReceived: string,
  balance: string,
  spending: string,
  spent: string,
  burned: string,
  recvCount: number,
  mineCount: number,
  spentCount: number,
  balanceCount: number,
  mined24: string,
};
export type Block_t = {
  hash: string,
  height: number,
  version: number,
  size: number,
  merkleRoot: string,
  time: string,
  nonce: number,
  bits: number,
  difficulty: number,
  previousBlockHash: string,
  transactionCount: number,
  dateMs: string,
  pcAnnCount: string,
  pcAnnDifficulty: number,
  pcBlkDifficulty: number,
  pcVersion: number,
  networkSteward: string,
  blocksUntilRetarget: number,
  retargetEstimate: number,
};
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
  dateMs: string,
};
export type CoinAggregate_t = {
  address: string,
  value: string,
  spentcount: number,
};
export type TransactionDetail_t = {
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
  dateMs: string,
  blockTime: string,
  blockHash: string,
  blockHeight: number,
  input: Array<CoinAggregate_t>,
  output: Array<CoinAggregate_t>,
};
export type Coins_t = {
  address: string,
  mintTxid: string,
  mintIndex: number,
  dateMs: string,
  value: string,
  coinbase: 0|1|2,
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
  prevState: "nothing"|"mempool"|"block"|"spending"|"spent"|"burned",
  currentState: "mempool"|"block"|"spending"|"spent"|"burned",
};
export type RpcError_t = {
  code: number,
  error: string,
  fn: string,
};
export type Apiv1_enabledChains_result = Array<{
  chain: string,
  network: string,
}>;
export type Apiv1_enabledChains = RpcError_t | Apiv1_enabledChains_result;
export type Apiv1_richlist_resultElem = {
  address: string,
  balance: string,
};
export type Apiv1_richlist_result = {
  results: Array<Apiv1_richlist_resultElem>,
  prev: string,
  next: string,
};
export type Apiv1_richlist = RpcError_t | Apiv1_richlist_result;
export type Apiv1_ns_result = {
  networkSteward: string,
  votesAgainst: string,
  votesNeeded: string,
};
export type Apiv1_ns = RpcError_t | Apiv1_ns_result;
export type Apiv1_nsCandidates_resultElem = {
  candidate: string,
  votesFor: string,
  votesAgainst: string,
};
export type Apiv1_nsCandidates_result = {
  results: Array<Apiv1_nsCandidates_resultElem>,
  prev: string,
  next: string,
};
export type Apiv1_nsCandidates = RpcError_t | Apiv1_nsCandidates_result;
export type Apiv1_address_result = AddrStats_t;
export type Apiv1_address = RpcError_t | Apiv1_address_result;
export type Apiv1_addressCoins_resultElem = TransactionDetail_t;
export type Apiv1_addressCoins_result = {
  results: Array<Apiv1_addressCoins_resultElem>,
  prev: string,
  next: string,
};
export type Apiv1_addressCoins = RpcError_t | Apiv1_addressCoins_result;
export type Apiv1_addressIncome_resultElem = {
  date: string,
  received: string,
};
export type Apiv1_addressIncome_result = {
  results: Array<Apiv1_addressIncome_resultElem>,
  prev: string,
  next: string,
};
export type Apiv1_addressIncome = RpcError_t | Apiv1_addressIncome_result;
export type Apiv1_block_result = Block_t;
export type Apiv1_block = RpcError_t | Apiv1_block_result;
export type Apiv1_blockCoins_resultElem = TransactionDetail_t;
export type Apiv1_blockCoins_result = {
  results: Array<Apiv1_blockCoins_resultElem>,
  prev: string,
  next: string,
};
export type Apiv1_blockCoins = RpcError_t | Apiv1_blockCoins_result;
export type Apiv1_chainUp_resultElem = Block_t;
export type Apiv1_chainUp_result = {
  results: Array<Apiv1_chainUp_resultElem>,
  prev: string,
  next: string,
};
export type Apiv1_chainUp = RpcError_t | Apiv1_chainUp_result;
export type Apiv1_chainDown_resultElem = Block_t;
export type Apiv1_chainDown_result = {
  results: Array<Apiv1_chainDown_resultElem>,
  prev: string,
  next: string,
};
export type Apiv1_chainDown = RpcError_t | Apiv1_chainDown_result;
export type Apiv1_tx_result = TransactionDetail_t;
export type Apiv1_tx = RpcError_t | Apiv1_tx_result;
export type Apiv1_txDetail_result = {
  inputs: Array<Coins_t>,
  outputs: Array<Coins_t>,
  prev: string,
  next: string,
};
export type Apiv1_txDetail = RpcError_t | Apiv1_txDetail_result;
export type Apiv1_packetcryptBlock_result = {
  blockBits: number,
  blockEncryptions: number,
};
export type Apiv1_packetcryptBlock = RpcError_t | Apiv1_packetcryptBlock_result;
export type Apiv1_packetcryptStats_resultElem = {
  date: string,
  pcVersion: number,
  bitsPerSecond: number,
  encryptionsPerSecond: number,
};
export type Apiv1_packetcryptStats_result = {
  results: Array<Apiv1_packetcryptStats_resultElem>,
  prev: string,
  next: string,
};
export type Apiv1_packetcryptStats = RpcError_t | Apiv1_packetcryptStats_result;
*/

const Apiv1_enabledChains_sample /*:Apiv1_enabledChains*/ = [
	{
		"chain": "PKT",
		"network": "pkt"
	}
];
module.exports.Apiv1_enabledChains_sample = Apiv1_enabledChains_sample;
const Apiv1_richlist_result_sample /*:Apiv1_richlist_result*/ = {
	"results": [
		{
			"address": "pkt1qkpuqg30wm0ju40yd4hyk7ehc48cy7mgj64xl7vxwt7mxxwqrt9qqetwlau",
			"balance": "586694940522752719"
		},
		{
			"address": "pkt1q2sj8djct9e4w0a0770l0gtquq6m4s4qd7fk04t",
			"balance": "134170461490488544"
		},
		{
			"address": "pkt1q3rnwa8jw0ucs2qgxlrm06kfxwljlqxpzr85t9r30jv43fj7j29dquswyxt",
			"balance": "121480900830546791"
		}
	],
	"prev": "",
	"next": "/stats/richlist/3/2"
};
module.exports.Apiv1_richlist_result_sample = Apiv1_richlist_result_sample;
const Apiv1_ns_sample /*:Apiv1_ns*/ = {
	"networkSteward": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
	"votesAgainst": "68433255",
	"votesNeeded": "759352450843302690"
};
module.exports.Apiv1_ns_sample = Apiv1_ns_sample;
const Apiv1_nsCandidates_sample /*:Apiv1_nsCandidates*/ = {
	"results": [
		{
			"candidate": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
			"votesFor": "1137612916",
			"votesAgainst": "68433255"
		},
		{
			"candidate": "pkt1qeuw07385audg2dpy4px75e90efjn5symq85nwx",
			"votesFor": "34202599",
			"votesAgainst": "1073741824"
		}
	],
	"prev": "",
	"next": ""
};
module.exports.Apiv1_nsCandidates_sample = Apiv1_nsCandidates_sample;
const Apiv1_address_sample /*:Apiv1_address*/ = {
	"unconfirmedReceived": "0",
	"confirmedReceived": "304813953858954700",
	"balance": "97930685523287990",
	"spending": "0",
	"spent": "85006797353036390",
	"burned": "121876470982630320",
	"recvCount": 558,
	"mineCount": 373294,
	"spentCount": 98517,
	"balanceCount": 132653,
	"mined24": "1015613494267869"
};
module.exports.Apiv1_address_sample = Apiv1_address_sample;
const Apiv1_addressCoins_sample /*:Apiv1_addressCoins*/ = {
	"results": [
		{
			"txid": "112cc4eee85092a6b16c9df41508c4cafd80892806aa50d22f3f1d1caa51e284",
			"size": 291184,
			"vsize": 93466,
			"version": 1,
			"locktime": 0,
			"inputCount": 670,
			"outputCount": 2,
			"value": "537361637079083",
			"coinbase": "",
			"firstSeen": "2020-03-27T11:55:57.000Z",
			"dateMs": "1587144836024",
			"blockTime": "2020-03-27T11:55:57.000Z",
			"blockHash": "79d8fea1ed5c9283cde6f7046cbc29e862862b7bfb9ee3c06df97d40b1774420",
			"blockHeight": 328934,
			"input": [
				{
					"address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
					"value": "537361637178990",
					"spentcount": 670
				}
			],
			"output": [
				{
					"address": "p7Gdf7YhaxSkWm6u6yU452S6C9mJpuTfwu",
					"value": "536870912000000",
					"spentcount": 0
				},
				{
					"address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
					"value": "490725079083",
					"spentcount": 0
				}
			]
		},
		{
			"txid": "3f6eac52f326aab009568049c71dabeb87cf3f6ae559d91883521733a49d2973",
			"size": 291208,
			"vsize": 93472,
			"version": 1,
			"locktime": 0,
			"inputCount": 670,
			"outputCount": 2,
			"value": "537361637079083",
			"coinbase": "",
			"firstSeen": "2020-03-27T11:55:57.000Z",
			"dateMs": "1587144836024",
			"blockTime": "2020-03-27T11:55:57.000Z",
			"blockHash": "79d8fea1ed5c9283cde6f7046cbc29e862862b7bfb9ee3c06df97d40b1774420",
			"blockHeight": 328934,
			"input": [
				{
					"address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
					"value": "537361637178990",
					"spentcount": 670
				}
			],
			"output": [
				{
					"address": "p7Gdf7YhaxSkWm6u6yU452S6C9mJpuTfwu",
					"value": "536870912000000",
					"spentcount": 0
				},
				{
					"address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
					"value": "490725079083",
					"spentcount": 0
				}
			]
		}
	],
	"prev": "",
	"next": "/address/pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2/coins/2/2"
};
module.exports.Apiv1_addressCoins_sample = Apiv1_addressCoins_sample;
const Apiv1_addressIncome_sample /*:Apiv1_addressIncome*/ = {
	"results": [
		{
			"date": "2020-04-23T00:00:00.000Z",
			"received": "974469237570450"
		},
		{
			"date": "2020-04-22T00:00:00.000Z",
			"received": "1133271631841190"
		},
		{
			"date": "2020-04-21T00:00:00.000Z",
			"received": "1125333145305633"
		},
		{
			"date": "2020-04-20T00:00:00.000Z",
			"received": "1053148605640953"
		},
		{
			"date": "2020-04-19T00:00:00.000Z",
			"received": "1002620571100263"
		},
		{
			"date": "2020-04-18T00:00:00.000Z",
			"received": "957145340013642"
		}
	],
	"prev": "",
	"next": "/address/pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2/income/5/2"
};
module.exports.Apiv1_addressIncome_sample = Apiv1_addressIncome_sample;
const Apiv1_block_sample /*:Apiv1_block*/ = {
	"hash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
	"height": 360272,
	"version": 536870912,
	"size": 42312,
	"merkleRoot": "41536ec2da248a131e5a745da7fbe3ba71523e81f5fc6c0506b7eafd099379c4",
	"time": "2020-04-18T07:08:55.000Z",
	"nonce": 928312243,
	"bits": 489263533,
	"difficulty": 25224.89930326,
	"previousBlockHash": "afc1d40f153525756ba7b1984481b0a9152889d5940e0ca89acbfa0354399c55",
	"transactionCount": 17,
	"pcAnnCount": "724731",
	"pcAnnDifficulty": 127.99998474,
	"pcBlkDifficulty": 4021122.0868802,
	"pcVersion": 2,
	"dateMs": "1587193751245",
	"networkSteward": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
	"blocksUntilRetarget": 592,
	"retargetEstimate": 0.9660881230768897
};
module.exports.Apiv1_block_sample = Apiv1_block_sample;
const Apiv1_blockCoins_sample /*:Apiv1_blockCoins*/ = {
	"results": [
		{
			"txid": "33e7813c8146d1d5c755731a66092c3af6f01ea61391b73f5390680ca6114bb0",
			"size": 5489,
			"vsize": 5462,
			"version": 1,
			"locktime": 0,
			"inputCount": 0,
			"outputCount": 157,
			"value": "3623298864903",
			"coinbase": "03507f05000b2f503253482f706b74642f",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [],
			"output": [
				{
					"address": "pkt1q2sj8djct9e4w0a0770l0gtquq6m4s4qd7fk04t",
					"value": "1914970048561",
					"spentcount": 0
				},
				{
					"address": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
					"value": "721829064867",
					"spentcount": 0
				},
				{
					"address": "pkt1q3rnwa8jw0ucs2qgxlrm06kfxwljlqxpzr85t9r30jv43fj7j29dquswyxt",
					"value": "290146977054",
					"spentcount": 0
				},
				{
					"address": "p96XfSnLNM9etQWVvzhUqkqBJwJKs3Lfdx",
					"value": "116058790821",
					"spentcount": 0
				},
				{
					"address": "pNNzRrn6d6S2yZpTedBsWFVj9qAWeUAV49",
					"value": "43750443016",
					"spentcount": 0
				},
				{
					"address": "p6hYxFZY1gCMGB2KzuVMGWfnsVLwk4nPu3",
					"value": "43124844895",
					"spentcount": 0
				},
				{
					"address": "p7FjSmF7A51bAKEfuKe5fDG2t7QrWjhmqE",
					"value": "42276288566",
					"spentcount": 0
				},
				{
					"address": "pGhHJ5Tz9RapJ4BMw371xYKCUsNh9i9Beo",
					"value": "41508547125",
					"spentcount": 0
				},
				{
					"address": "pENvxqTiPTieCtEMkHv427o5XWpdsDj1F1",
					"value": "36952607783",
					"spentcount": 1
				},
				{
					"address": "pDXNYx4xTY28p7tcYJULzrBA6wxXz9Jxbk",
					"value": "33933270171",
					"spentcount": 0
				},
				{
					"address": "p9kKSSkmzQfrtzKySgqDiWwVmwYYjEqVPe",
					"value": "32952270801",
					"spentcount": 0
				},
				{
					"address": "pDEn6kwubA3JNcFeEBWLLdM8bxmMKz6oyB",
					"value": "23052446955",
					"spentcount": 0
				},
				{
					"address": "pKHsMf6Eg8YB2jTJUpdRbCj7RpvpMpYRkU",
					"value": "19990865786",
					"spentcount": 0
				},
				{
					"address": "pSYr1sswZobgBWQCRqZXFUpoUyJJTgJ9Ho",
					"value": "5501473031",
					"spentcount": 0
				},
				{
					"address": "pSH1jgkuEWpPp6CLeN9VVq2LRhd9eH5c7z",
					"value": "3441588173",
					"spentcount": 0
				},
				{
					"address": "pRoX4rXvd9JKL8ic4P1X3eDXZkFNk9ai6G",
					"value": "2961626258",
					"spentcount": 0
				},
				{
					"address": "pFAWnpyFGRh9MyyNsD17BYdtFaKPSa2QLH",
					"value": "2274255611",
					"spentcount": 0
				},
				{
					"address": "p5ZZyD4bWycUqGia35BwFybHFvUCQsNsEt",
					"value": "2255580827",
					"spentcount": 0
				},
				{
					"address": "p8vY35P6houwhpKhg4bgTykv7RwEZXrw2j",
					"value": "2217755500",
					"spentcount": 0
				},
				{
					"address": "pUB6AQioYHGR1Unvh5Gqq4ha38NCi1Nu1t",
					"value": "2217748292",
					"spentcount": 0
				},
				{
					"address": "pUPZ7vN1gQPQcY3GNDWbMzVdGLfFhZ8xTD",
					"value": "2214924968",
					"spentcount": 0
				},
				{
					"address": "pTySLBnjZaqch7B46hdT7XrsmZCrxJxndT",
					"value": "2195418806",
					"spentcount": 0
				},
				{
					"address": "pGFgw2yQHQXfqdnRpWqxKRbP1D35YZ9kYX",
					"value": "2189245939",
					"spentcount": 0
				},
				{
					"address": "pDjXjjeCpwUX1a8QNHn2Rwmp3auaYEBjk8",
					"value": "2185096254",
					"spentcount": 0
				},
				{
					"address": "pTPwhCc4d5RmR9t4s7umKHZ4eJJzaBHRpc",
					"value": "2182806359",
					"spentcount": 0
				},
				{
					"address": "pUfDAPYttQo2SsjFyMPbpVNgwzjraGPZeX",
					"value": "2171859072",
					"spentcount": 0
				},
				{
					"address": "p9Pa8bjKFR6tm6Ub9Jq7RTg1j1DTZ6AsUq",
					"value": "2169687569",
					"spentcount": 0
				},
				{
					"address": "pFm2FuHf7EwtyM88kbyqGo7AbJSjhgXdZN",
					"value": "2153193899",
					"spentcount": 0
				},
				{
					"address": "pUoZGEJo2Dcw73tNfAiocZGBQg5xUGf22w",
					"value": "2137969578",
					"spentcount": 0
				},
				{
					"address": "pH7bW2rpxzzwQvFNhuTsZu6pnxaYuPcnAa",
					"value": "2126683492",
					"spentcount": 0
				},
				{
					"address": "pGGBPA6pPQygrkYyRPPJXbasxhEjvZm2rB",
					"value": "2121113735",
					"spentcount": 0
				},
				{
					"address": "pP2wH52VRMSqhdskALruojqtZQe577Q4bd",
					"value": "2119128999",
					"spentcount": 0
				},
				{
					"address": "pAKm5o1NnXct7QxscuUBsVz7WNJysit1Ea",
					"value": "2118412956",
					"spentcount": 0
				},
				{
					"address": "pEQt3KB1FSd1wG5K7qCEZn2sDHxsbH7Mgt",
					"value": "2116175923",
					"spentcount": 0
				},
				{
					"address": "pNZrb6dHks4ALp9kv9GwxM4RQFXd79VoZQ",
					"value": "2115476699",
					"spentcount": 0
				},
				{
					"address": "p8wHu3mr41LTb9BqRgeuirYx8F8N3Cc1tK",
					"value": "2110647014",
					"spentcount": 0
				},
				{
					"address": "pGJM4dnz4VK6yNRN7baSgEemNQKCXpw83L",
					"value": "2110087155",
					"spentcount": 0
				},
				{
					"address": "pJsiQv9Q23pfy8AWDdHbufQAuUm6kGf8v4",
					"value": "2107732383",
					"spentcount": 0
				},
				{
					"address": "pS4ACZFjp2MX7sdpGV5NSN6Hfbg8xNvBs7",
					"value": "2104281921",
					"spentcount": 0
				},
				{
					"address": "pJMETYFhJTveEkZ4gRH6nijpVPzCbrN7yt",
					"value": "2092815623",
					"spentcount": 0
				},
				{
					"address": "p6fG8ujbu55JDG8ikcUxDpvaKrS3exLwv3",
					"value": "2089110462",
					"spentcount": 0
				},
				{
					"address": "pGBYdRYajH1WsTDUE4JwUVXcDuJDKzhusC",
					"value": "2084977596",
					"spentcount": 0
				},
				{
					"address": "p7mpDwkYCxm2C8mK9fyj3zokruxTv5cHkD",
					"value": "2082204732",
					"spentcount": 0
				},
				{
					"address": "pMmEnaVkWuopf6pSJFU8PgCQKJtFSyMn1d",
					"value": "2081140279",
					"spentcount": 0
				},
				{
					"address": "p6sRUcs6muokogA2CKxpJ2kCYYYZ548TKU",
					"value": "2080505932",
					"spentcount": 0
				},
				{
					"address": "pBNLP8kiKjMMVqrKxJvo2C3vqxAPo6oXLB",
					"value": "2077718651",
					"spentcount": 0
				},
				{
					"address": "pB9DjpytbeqJKkWyTpMNQGoH1RsUpe1uVz",
					"value": "2074912148",
					"spentcount": 0
				},
				{
					"address": "pKBsvWJj4tycRETVwSRmi1kGnv1bEaBxAG",
					"value": "2074597377",
					"spentcount": 0
				},
				{
					"address": "pEAdaSfF4iLxyRw8PVuQ3HcBJxf51TU7M6",
					"value": "2070459706",
					"spentcount": 1
				},
				{
					"address": "p6zeEdBvJzmRLXAutuJ1y53Ujz7bkR3Q3e",
					"value": "2068816171",
					"spentcount": 0
				},
				{
					"address": "pHnq9XZZAUsp4nbZ385nwhY7FSTRzmUEty",
					"value": "2059651783",
					"spentcount": 0
				},
				{
					"address": "p6kADP6jaA7GCUL5EvUhcrRb3T7gWK5CEF",
					"value": "2050107748",
					"spentcount": 0
				},
				{
					"address": "pUh4UFA4b59h3iJfv8WEfEPL1NfAVbezwn",
					"value": "2043930076",
					"spentcount": 0
				},
				{
					"address": "pUHP7FfmPmybvoJhBd3x62qE4iyYT8BaCh",
					"value": "2039840462",
					"spentcount": 0
				},
				{
					"address": "p7zJUDmw8rRK7RdPcNNUXscJDSXbCHqhEs",
					"value": "2033905475",
					"spentcount": 0
				},
				{
					"address": "p5f3sRpjsRKRx4mz4t8Lbm5MRxpJnpo4V9",
					"value": "2032242718",
					"spentcount": 0
				},
				{
					"address": "pQfFazJqKXiM5gnHybRzT7NHE2XJvnKv3s",
					"value": "2031543495",
					"spentcount": 0
				},
				{
					"address": "pTmkEh5UJE5nW4oSDQRL9e1mzJZUEYkLwg",
					"value": "2029878335",
					"spentcount": 0
				},
				{
					"address": "p7zB7vsfMHjEf65AbtE6ATe4YmPNXzoqzF",
					"value": "2025781512",
					"spentcount": 0
				},
				{
					"address": "pBpeTjtvRohP3pEoT9nthvboP6JaNsKsEL",
					"value": "2021518894",
					"spentcount": 0
				},
				{
					"address": "pJvYXzhs5g9zBdfakdaM6UjfrZatiK1idp",
					"value": "2020215107",
					"spentcount": 0
				},
				{
					"address": "pUTcRKHgc4BaFSfPUBFggRoZTTrdAw4r9b",
					"value": "2020067586",
					"spentcount": 0
				},
				{
					"address": "p8oWYwKSNLchMMXy3h1DcahKTFpRG8VFTJ",
					"value": "2019731190",
					"spentcount": 0
				},
				{
					"address": "pEDqeBSqHacDnXdmfmQzNTs19D5V7vbYSF",
					"value": "2016886241",
					"spentcount": 0
				},
				{
					"address": "pQzpipC9Nwq9kEiV6hHyewt8ryEvkfafMm",
					"value": "2015451752",
					"spentcount": 0
				},
				{
					"address": "pDS4WAiqABqmJBZbwFZkKaD6ccskHBQVmm",
					"value": "2014627582",
					"spentcount": 0
				},
				{
					"address": "p8wT3rxJDJ5Ha5M52mUwKFXYWujEF7FSJJ",
					"value": "2009134716",
					"spentcount": 0
				},
				{
					"address": "p79x46yPaN6a4ufPrVnJWxUtns1TMsu7fx",
					"value": "2007765103",
					"spentcount": 0
				},
				{
					"address": "pBmc5hGVzSvhEyBNdkE4ai5firyqpBiuEw",
					"value": "2006311392",
					"spentcount": 0
				},
				{
					"address": "pUNTCch3mocadQCJbsA7unNTxm54N4ErQs",
					"value": "2006164819",
					"spentcount": 0
				},
				{
					"address": "p7sgpZH4bvjhi6CSq1kVyS9dczkHiB474R",
					"value": "2004629412",
					"spentcount": 0
				},
				{
					"address": "pHKgy6e5nreTAfgh7qqZK3bXKjfzyDXmX6",
					"value": "2000261070",
					"spentcount": 0
				},
				{
					"address": "pJ3fGP8fAT9V2qK9gAcCBSa8aLgCTahhSo",
					"value": "2000095275",
					"spentcount": 0
				},
				{
					"address": "pHJqenCwadPS1hrqMNBkjETR8nqn2aWSkN",
					"value": "2000015981",
					"spentcount": 0
				},
				{
					"address": "pFLM2fDJDLtmX7dRmHje5LYHam8B6jTF97",
					"value": "1995868699",
					"spentcount": 0
				},
				{
					"address": "pGhnavTgpj1EmtjKB35GLhBo2X1jmxgvz5",
					"value": "1995623611",
					"spentcount": 0
				},
				{
					"address": "pU8emqk21gwFeeDoeDEiNvbjcn96dcHUqj",
					"value": "1989558871",
					"spentcount": 0
				},
				{
					"address": "pQDh59KpPAWcMFjgXAis1nfjacRVCKKzJi",
					"value": "1975802678",
					"spentcount": 0
				},
				{
					"address": "pA98XKWLf3huPvdo2zM4VY7oACMDLx3fqE",
					"value": "1970470801",
					"spentcount": 0
				},
				{
					"address": "pGMzwYKE6xhXgkWCFdVfHnrKeiR7D2YTWN",
					"value": "1969384723",
					"spentcount": 0
				},
				{
					"address": "pJWpYKqog4BFfdx48NpEeLGJKGFg9oGYb5",
					"value": "1959533126",
					"spentcount": 0
				},
				{
					"address": "pJ37XUQArSE92B9Brg76se63F5X5MK5znh",
					"value": "1958797860",
					"spentcount": 0
				},
				{
					"address": "pRFwuQwhjsSTM1n7LQJxDXhsJEUq8KUp1f",
					"value": "1939993324",
					"spentcount": 0
				},
				{
					"address": "p78ZFwe7o5s9WXH7UZ5qAWou4NgZzYrQKa",
					"value": "1939073040",
					"spentcount": 0
				},
				{
					"address": "p7moN8njSPHfzM9Ba3TYUrtf5WoTKeJV8w",
					"value": "1909366871",
					"spentcount": 0
				},
				{
					"address": "p7GpHCxibb65y2fL8ahx9HXraycLk9AiHL",
					"value": "1906471462",
					"spentcount": 0
				},
				{
					"address": "pEeCHsnEybhzMLxMvmfYVeiLEfsKUyBPaQ",
					"value": "1901990187",
					"spentcount": 1
				},
				{
					"address": "p7hAmtMAXFetUtmfK3HtZYE6e2AXe4SAQU",
					"value": "1892568696",
					"spentcount": 0
				},
				{
					"address": "pBr6HYvUDuzxjdLAGMZxm89Rn968uBNywu",
					"value": "1889805443",
					"spentcount": 0
				},
				{
					"address": "pPtsDqKqsFhCQz5iNU34cYqef4sWbxTxKk",
					"value": "1889262404",
					"spentcount": 1
				},
				{
					"address": "pTaZvLWfkRhwYrsbqa4Vymsni1dXbf9wBf",
					"value": "1883264944",
					"spentcount": 1
				},
				{
					"address": "pKXzVKrgwuEibGtP6tgiMxu9krgjvyX4td",
					"value": "1877039215",
					"spentcount": 0
				},
				{
					"address": "pSuuXjc284QAp1CkWRWNGZRUW5gNSP36R6",
					"value": "1862381961",
					"spentcount": 0
				},
				{
					"address": "pF5WhLxr72WAN2i54k9Av2FBXG84g2dqWa",
					"value": "1809228990",
					"spentcount": 1
				},
				{
					"address": "pHZYwr7b1fmZ4YNEur6osRFSRUstqvKFnB",
					"value": "1804944747",
					"spentcount": 0
				},
				{
					"address": "pKAPEW5sfJ8XaytZ47gG4kTmVKXjMTwpPg",
					"value": "1782238017",
					"spentcount": 1
				},
				{
					"address": "pErVx2FcFN1DqaGNShxKnkhGBFwXYh4Dnz",
					"value": "1779996178",
					"spentcount": 0
				},
				{
					"address": "pGiDeDPH4Kbc7piERwZEv7uRozqthuRMaW",
					"value": "1772211013",
					"spentcount": 0
				},
				{
					"address": "pE9aBiFkXya47LHQAL2QEbj9qMqUe9FzeM",
					"value": "1767426982",
					"spentcount": 1
				},
				{
					"address": "pTZqMpbKmUFHvAKcnyLmbVmer1RBvGgPy1",
					"value": "1764673340",
					"spentcount": 0
				},
				{
					"address": "pHP8MxqVHk2VXKouAEb3Mf6oKs3ggkKNZx",
					"value": "1761482384",
					"spentcount": 0
				},
				{
					"address": "pKHufhwm4cEwu1vAqDUzryeqj71sum9bxx",
					"value": "1758596587",
					"spentcount": 1
				},
				{
					"address": "pL4gZHh4tcgwa2F5h1M2Wp2UDgueUt9B4V",
					"value": "1752130575",
					"spentcount": 0
				},
				{
					"address": "pQiSsWHWdymNDXF84DUtgPEiLsWcsm7Pbs",
					"value": "1748824283",
					"spentcount": 0
				},
				{
					"address": "pAxH6x6Vp2pvM1H4BEa8vRW5cM8xktKPVH",
					"value": "1746938063",
					"spentcount": 0
				},
				{
					"address": "pRMtuSdaLwegedcMit6vtCfzqH4iLWTnL3",
					"value": "1741452405",
					"spentcount": 1
				},
				{
					"address": "pR9xx5HjLb9TqRD4SeyUHEz5MgQ9SdJpEh",
					"value": "1740885337",
					"spentcount": 0
				},
				{
					"address": "pKkPyZvvYhcNd6CqShqq9neL2WXoEvvCvS",
					"value": "1737401236",
					"spentcount": 0
				},
				{
					"address": "pSjWprtwJbo3dKAQjmSmV5ZCpSJg6jdG7N",
					"value": "1735726464",
					"spentcount": 1
				},
				{
					"address": "pBJmTba3FTD6LH1qWCRBqey3MmoDGkXxfB",
					"value": "1733025685",
					"spentcount": 0
				},
				{
					"address": "pSHL4udYaDPkwenG61f3uByHmMeS4xVv8U",
					"value": "1724099177",
					"spentcount": 0
				},
				{
					"address": "pDTBomM3fS9i7EsceS39rh61LD75DjGkN8",
					"value": "1718212247",
					"spentcount": 0
				},
				{
					"address": "pNUtoHLyPrwtdnFd6yM53TLkhHXsCpi6c3",
					"value": "1713529134",
					"spentcount": 1
				},
				{
					"address": "pTtkQLWtdknxbRAkaouXh1W6e5Fv12e32K",
					"value": "1712195564",
					"spentcount": 0
				},
				{
					"address": "pB1EdV7d9kyQGZL7th1XruqkoD6c83mnpf",
					"value": "1696915977",
					"spentcount": 0
				},
				{
					"address": "pQt196aWMsjiBNtmWX26vfEBSQwNYtd1W2",
					"value": "1694998520",
					"spentcount": 0
				},
				{
					"address": "pAas7pV7adaMw7C4vaCTsng6yQGo6gJXyg",
					"value": "1689731520",
					"spentcount": 0
				},
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "1683015614",
					"spentcount": 0
				},
				{
					"address": "p7jMZJuwBmQLVafmRLPWHwAdG9r1NtteBL",
					"value": "1683008406",
					"spentcount": 1
				},
				{
					"address": "pBDa7tS3MBGAu6PdoMuyoeuZX8tFfSiZtb",
					"value": "1677107059",
					"spentcount": 1
				},
				{
					"address": "p5mmkqcXCBSUYoZMwc6idMLqQcKBUjnpEa",
					"value": "1673949742",
					"spentcount": 0
				},
				{
					"address": "pJaDbF68m5c1VHyodMrYT9r1GcnYRJTWfE",
					"value": "1669672707",
					"spentcount": 1
				},
				{
					"address": "pFh4Z3vtHgxqT9AZjW478uQ9sgbyeZfDRW",
					"value": "1668442459",
					"spentcount": 0
				},
				{
					"address": "pLofjEbedWJJneyRYUmd1hHh6282aCjUR2",
					"value": "1667464508",
					"spentcount": 1
				},
				{
					"address": "pKFYxkGnBvECkFqGFR6wJkBvc2jVqnpJ1c",
					"value": "1667046416",
					"spentcount": 0
				},
				{
					"address": "pJKGsDRU5MShvWdX5BgDxSQrcoDSB4oVhp",
					"value": "1661459839",
					"spentcount": 0
				},
				{
					"address": "pH5TsMDKjLqcfb3eceMewSYAX9zrxrFk86",
					"value": "1661202737",
					"spentcount": 0
				},
				{
					"address": "pEgbGnTBwetCzzehT4CexS7ucW4VnrCiZR",
					"value": "1660787047",
					"spentcount": 0
				},
				{
					"address": "pE8JwUkTX1i9ZeKvVRn7ygYeXj29UWES2k",
					"value": "1660126269",
					"spentcount": 0
				},
				{
					"address": "pTEYd629oXnAftnmKccZdP6LG6Bt94Sf1j",
					"value": "1658763866",
					"spentcount": 0
				},
				{
					"address": "pDfqWb8zU67gUHxiBP6RMJgdLiPJMWWa1D",
					"value": "1654316230",
					"spentcount": 0
				},
				{
					"address": "pFg649vAsK1ZhVSLZaRfXXH2jRsouY2JoM",
					"value": "1652530928",
					"spentcount": 0
				},
				{
					"address": "p8ph72kX2ed3A9y8hBfdXNfbbEsknTTpb7",
					"value": "1650197782",
					"spentcount": 0
				},
				{
					"address": "pKFtAhmjhMaVFAvQywR27YEvfZpA3fR8GL",
					"value": "1644781806",
					"spentcount": 0
				},
				{
					"address": "p8iuSBJMHuWQL74xhVNA2EuqGPcas4nUYf",
					"value": "1632837345",
					"spentcount": 0
				},
				{
					"address": "pD9TSdtuAnsALquaoBkkYUrbTLzdQss2yS",
					"value": "1626224761",
					"spentcount": 0
				},
				{
					"address": "p78D5XccDYAi5puZWC6epG4y6uAkFy7UHa",
					"value": "1609767788",
					"spentcount": 0
				},
				{
					"address": "pJGuhzvaVfam7Dm3Lweyej9JnV2RapqszM",
					"value": "1607314500",
					"spentcount": 0
				},
				{
					"address": "pSBRvDc9pVTsAHCkS1NdRnTE2JqB1ucPkw",
					"value": "1598224600",
					"spentcount": 0
				},
				{
					"address": "pPaj3AAVtTj4oHry3zHhGw2ZBPeSBgiRYh",
					"value": "1587986147",
					"spentcount": 0
				},
				{
					"address": "pRfHeDGDNmyaZg1En4h44m3xmKFmDqdEcU",
					"value": "1587832366",
					"spentcount": 0
				},
				{
					"address": "pCGF23JLECkuQ1D7b3XJWa5SRNGyRJ81zM",
					"value": "1564092420",
					"spentcount": 0
				},
				{
					"address": "pLGAHaeSL3Qq1DXP14LVpE35dnSaegZCrk",
					"value": "1525469354",
					"spentcount": 0
				},
				{
					"address": "pFPMDuvbXxawuSpXvPS8gjnSCJgy8AjsYV",
					"value": "1480586919",
					"spentcount": 0
				},
				{
					"address": "p6JcfLWHxfSmSJZUrrxXtP4t1cLNpAvexm",
					"value": "1464586484",
					"spentcount": 0
				},
				{
					"address": "pNi1cMNrVgReBpznvg6rRinqWwwdFMt6N8",
					"value": "1393777529",
					"spentcount": 0
				},
				{
					"address": "p7EP5UdZJZpTptiNt468J9JPfqhNP63QtN",
					"value": "1383137804",
					"spentcount": 0
				},
				{
					"address": "pBYK72pzjuTvbPLywbzbhG348DcqgRJATQ",
					"value": "1026089493",
					"spentcount": 0
				},
				{
					"address": "pkt1qjfqvwcf3w6ukyzckhgr8pglcvu9s05vlw5ufsl",
					"value": "639887503",
					"spentcount": 0
				},
				{
					"address": "pkt1qwm8jxv94rlyz0hkm23sszz2lulsvf50k0agx4w",
					"value": "329834515",
					"spentcount": 0
				},
				{
					"address": "p7A4miQjxjmLPfbGyqRqyqTb5be9p527zS",
					"value": "269992069",
					"spentcount": 0
				},
				{
					"address": "pHZF7gt7HbfcuaQFkjDbA8fMjD1kHfWsoJ",
					"value": "164325761",
					"spentcount": 0
				},
				{
					"address": "pLbeSo3Nm4nJvQuXmw1WaWCVdRvNXcMtGe",
					"value": "134181555",
					"spentcount": 1
				},
				{
					"address": "p7ULKQipciaewhednex6TGecjSbURJenrQ",
					"value": "120347590",
					"spentcount": 0
				},
				{
					"address": "pKsdAsE94xKZBrtc9AsgfjTrVBeFcTvc6i",
					"value": "111919429",
					"spentcount": 0
				},
				{
					"address": "script:aiSqIantS4QHmAtpvfPeIl/+30Ha6DyYsxEX8mWfvHwqRSf0qFM=",
					"value": "0",
					"spentcount": 0
				},
				{
					"address": "script:ajAJ+RECAAABIPEjsoZdbZqLC79FN1pystf491ukDmwqPR5R3CObd0pO+w4LAAAAAAA=",
					"value": "0",
					"spentcount": 0
				}
			]
		},
		{
			"txid": "09843fa58ed155681defe8bd8d24f826622449d29e0e84d741b9738e9a8f2118",
			"size": 1846,
			"vsize": 1846,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "546459286666",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "546459288529",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1q0jsvzhvhmgu0wpzwmh7csman9gdn7e0fz6qyex",
					"value": "9588374666",
					"spentcount": 1
				}
			]
		},
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
		},
		{
			"txid": "5529740d31d385ad93b820a69de0c2cc526b0474d8b7b4fa7cf1d51d43d12f63",
			"size": 1845,
			"vsize": 1845,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "547219207704",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "547219209567",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1qhpjqny7mc2h9cuw3twf3gaftpjxfyqtq8f3fl8",
					"value": "10348295704",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "63c525f3923dc4d48774869852de81035876a06d7c8720cc327845979f532f32",
			"size": 1844,
			"vsize": 1844,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "546978050991",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "546978052854",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1qka8ksyrh5r5lglvwcmrcecuyy4ax6e4ue2qvvp",
					"value": "10107138991",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "6604450a489a8c87de830b05a41abb321309adc6ab0292a10692cd614f48ebdc",
			"size": 1861,
			"vsize": 1771,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "546111935255",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "500607680591",
					"spentcount": 11
				},
				{
					"address": "pkt1qd6ltr2hcj75pr40jwlnwhngjnjm3qvkpvkwqtd",
					"value": "45504256447",
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
					"address": "pkt1qdx3u9jdj7sttx8q3xy3z899ypdyclkaed86d22",
					"value": "9241023255",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "6a37a2d667131cfa409d5bae33abdd880e150f425109dbaeb771de4392956eb7",
			"size": 1847,
			"vsize": 1847,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "546270359268",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "546270361131",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1qarcsnuv84xahvflnkvfne5l09yuvdqs37djcee",
					"value": "9399447268",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "826812ae86221adc2e458cfa092ab3f8d397252846d56286fd5d6b16dd1a1087",
			"size": 1846,
			"vsize": 1846,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "546648220295",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "546648222158",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1q9m00wxvvy898c4j86ns09q8um8pymnjf7e2y6d",
					"value": "9777308295",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "82c65813b5d5b20613a40a404b46ea82bd8da679fd48a4eaa69d57bb3b1bab6f",
			"size": 1845,
			"vsize": 1845,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "545740015931",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "545740017794",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1q0ufwgsya0fwy7gfrz8gpd6am73jlkmfd0xx2z9",
					"value": "8869103931",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "8f071f5d88a9fca27e9606aa8c2c53c8394710be700144a874d890072e3ab488",
			"size": 1860,
			"vsize": 1770,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "545810858203",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "500326846284",
					"spentcount": 11
				},
				{
					"address": "pkt1qwc9g2f996w4lmdcaxeuapar2f4m32ty0enpyy7",
					"value": "45484013702",
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
					"address": "pkt1qk54yu5hnwfpuyqlf59jd9a8kwcd2gcdlfrkjts",
					"value": "8939946203",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "ad159fbc9b060220b75619ec3033253fbd216c14261bd123ac43ebb1ab22546a",
			"size": 1846,
			"vsize": 1846,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "547111162241",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "547111164104",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1qzrkl8u9h50thcnae85jkmzezm6aemvz6mesu8c",
					"value": "10240250241",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "d979d09f85419a73e9ceac968570df94036784b7b13c1a577d4374daefda044a",
			"size": 1845,
			"vsize": 1845,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "545686872426",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "545686874289",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1qpud4ya07j8ex7zq04ke35pp08z8n4dep3rctkf",
					"value": "8815960426",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "e08b0e967de4bf9d457e3b2b2a585606f3c9a5efdace6457465803b1b3223aeb",
			"size": 1846,
			"vsize": 1846,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "546885934030",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "546885935893",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1qkdtmdk24y54vuj9c9l5p4rfye3p22grqrf8xv4",
					"value": "10015022030",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "e62bb08082962033e7d9f2c4e411f0b0176560f2e74d1bec52b628e0b9fce3c0",
			"size": 1847,
			"vsize": 1847,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "545895848677",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "545895850540",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1q6n8nrj0pxhn30vaf8syjwwh38sjypss5sjj57c",
					"value": "9024936677",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "ed66434e9d254d11b9bccf9ae5f60c27cbd85832eaf6b7cc58290f9be94ba674",
			"size": 1847,
			"vsize": 1847,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "547423669468",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "547423671331",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1qq4g9cuey5k90l23ja43gte4l39lywpz8064rlw",
					"value": "10552757468",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "efdac3aa60a8d1062c6646994d7423b73be315b3a59faa93e16eab6e33a56d64",
			"size": 1846,
			"vsize": 1846,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "547321079774",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "547321081637",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1qjg05xsxv7m997sma6lkhwlv2md0q7d72pw0460",
					"value": "10450167774",
					"spentcount": 1
				}
			]
		},
		{
			"txid": "fc90b299d7f720fd0937d851ee2191e401ecba3a0ae71c5aec82bef408b70321",
			"size": 1844,
			"vsize": 1844,
			"version": 1,
			"locktime": 0,
			"inputCount": 12,
			"outputCount": 2,
			"value": "545964713389",
			"coinbase": "",
			"firstSeen": "2020-04-18T07:08:55.000Z",
			"dateMs": "1587193751256",
			"blockTime": "2020-04-18T07:08:55.000Z",
			"blockHash": "9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8",
			"blockHeight": 360272,
			"input": [
				{
					"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
					"value": "545964715252",
					"spentcount": 12
				}
			],
			"output": [
				{
					"address": "pApenbwQ9WGsjw3Y714CgPz5VgofWtDc9f",
					"value": "536870912000",
					"spentcount": 0
				},
				{
					"address": "pkt1qc8f4yh0p27su9t2ldn59dhc6dtfzczwxm3dy0k",
					"value": "9093801389",
					"spentcount": 1
				}
			]
		}
	],
	"prev": "",
	"next": ""
};
module.exports.Apiv1_blockCoins_sample = Apiv1_blockCoins_sample;
const Apiv1_chainUp_sample /*:Apiv1_chainUp*/ = {
	"results": [
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
			"pcAnnCount": "15460",
			"pcAnnDifficulty": 4.00000143,
			"pcBlkDifficulty": 277811.56429495,
			"pcVersion": 0,
			"dateMs": "1587140429910",
			"networkSteward": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
			"blocksUntilRetarget": 1517,
			"retargetEstimate": 0
		}
	],
	"prev": "/chain/up/1/499",
	"next": "/chain/up/1/501"
};
module.exports.Apiv1_chainUp_sample = Apiv1_chainUp_sample;
const Apiv1_chainDown_sample /*:Apiv1_chainDown*/ = {
	"results": [
		{
			"hash": "1659dc7b29a248e3139c9907aef4ad9706ac3f5f95143c0162858ac77321e6e3",
			"height": 369372,
			"version": 536870912,
			"size": 32069,
			"merkleRoot": "538d0c9a5defed0b8d63859a18fe8091a12d05f3634a5fc0199c8f964748bc62",
			"time": "2020-04-24T13:43:57.000Z",
			"nonce": 36609226,
			"bits": 489213895,
			"difficulty": 25693.04371332,
			"previousBlockHash": "49504a1e402d2649f12b0762d7cc35e41b6903946d453d8b4f6f7d01d8486128",
			"transactionCount": 3,
			"pcAnnCount": "1296422",
			"pcAnnDifficulty": 15.99999809,
			"pcBlkDifficulty": 10923240.04752727,
			"pcVersion": 2,
			"dateMs": "1587735957002",
			"networkSteward": "pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2",
			"blocksUntilRetarget": 1572,
			"retargetEstimate": 0.9699692359469271
		}
	],
	"prev": "",
	"next": "/chain/down/1/2"
};
module.exports.Apiv1_chainDown_sample = Apiv1_chainDown_sample;
const Apiv1_tx_sample /*:Apiv1_tx*/ = {
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
};
module.exports.Apiv1_tx_sample = Apiv1_tx_sample;
const Apiv1_txDetail_sample /*:Apiv1_txDetail*/ = {
	"inputs": [
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
		},
		{
			"address": "pQN3tLD1NtKUXjydryQPkUyxwEeSATj9TK",
			"mintTxid": "b3d94156b0876780dad0dd960526ff045133cb3c200761af93c1ee2ece3df96f",
			"mintIndex": 57,
			"dateMs": "1587193751257",
			"value": "45568056918",
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
			"dateMs": "1587193751257",
			"value": "45567929741",
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
			"dateMs": "1587193751257",
			"value": "45567103152",
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
			"dateMs": "1587193751257",
			"value": "45566995436",
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
			"dateMs": "1587193751257",
			"value": "45566364210",
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
			"dateMs": "1587193751257",
			"value": "45565685328",
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
			"dateMs": "1587193751257",
			"value": "45565190016",
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
			"dateMs": "1587193751257",
			"value": "45565074705",
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
			"dateMs": "1587193751257",
			"value": "45564385542",
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
			"dateMs": "1587193751257",
			"value": "45563994488",
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
			"dateMs": "1587193751257",
			"value": "45562958240",
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
			"dateMs": "1587193751256",
			"value": "536870912000",
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
			"dateMs": "1587256293348",
			"value": "9920883037",
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
};
module.exports.Apiv1_txDetail_sample = Apiv1_txDetail_sample;
const Apiv1_packetcryptBlock_sample /*:Apiv1_packetcryptBlock*/ = {
	"blockBits": 10374257.777777778,
	"blockEncryptions": 10471812.5
};
module.exports.Apiv1_packetcryptBlock_sample = Apiv1_packetcryptBlock_sample;
const Apiv1_packetcryptStats_sample /*:Apiv1_packetcryptStats*/ = {
	"results": [
		{
			"date": "2020-04-24T00:00:00.000Z",
			"pcVersion": 2,
			"bitsPerSecond": 39037016,
			"encryptionsPerSecond": 5077576
		}
	],
	"prev": "",
	"next": "/packetcrypt/stats/1/2"
};
module.exports.Apiv1_packetcryptStats_sample = Apiv1_packetcryptStats_sample;

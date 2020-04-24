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

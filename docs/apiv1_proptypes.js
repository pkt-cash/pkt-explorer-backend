// SPDX-License-Identifier: MIT
const PropTypes = require('prop-types');
const AddrStats_t = module.exports.AddrStats_t = PropTypes.exact({
  unconfirmedReceived: PropTypes.string,
  confirmedReceived: PropTypes.string,
  balance: PropTypes.string,
  spending: PropTypes.string,
  spent: PropTypes.string,
  burned: PropTypes.string,
  recvCount: PropTypes.number,
  mineCount: PropTypes.number,
  spentCount: PropTypes.number,
  balanceCount: PropTypes.number,
  mined24: PropTypes.string,
});
const Block_t = module.exports.Block_t = PropTypes.exact({
  hash: PropTypes.string,
  height: PropTypes.number,
  version: PropTypes.number,
  size: PropTypes.number,
  merkleRoot: PropTypes.string,
  time: PropTypes.string,
  nonce: PropTypes.number,
  bits: PropTypes.number,
  difficulty: PropTypes.number,
  previousBlockHash: PropTypes.string,
  transactionCount: PropTypes.number,
  dateMs: PropTypes.string,
  pcAnnCount: PropTypes.string,
  pcAnnDifficulty: PropTypes.number,
  pcBlkDifficulty: PropTypes.number,
  pcVersion: PropTypes.number,
  networkSteward: PropTypes.string,
  blocksUntilRetarget: PropTypes.number,
  retargetEstimate: PropTypes.number,
});
const Transaction_t = module.exports.Transaction_t = PropTypes.exact({
  txid: PropTypes.string,
  size: PropTypes.number,
  vsize: PropTypes.number,
  version: PropTypes.number,
  locktime: PropTypes.number,
  inputCount: PropTypes.number,
  outputCount: PropTypes.number,
  value: PropTypes.string,
  coinbase: PropTypes.string,
  firstSeen: PropTypes.string,
  dateMs: PropTypes.string,
});
const CoinAggregate_t = module.exports.CoinAggregate_t = PropTypes.exact({
  address: PropTypes.string,
  value: PropTypes.string,
  spentcount: PropTypes.number,
});
const TransactionDetail_t = module.exports.TransactionDetail_t = PropTypes.exact({
  txid: PropTypes.string,
  size: PropTypes.number,
  vsize: PropTypes.number,
  version: PropTypes.number,
  locktime: PropTypes.number,
  inputCount: PropTypes.number,
  outputCount: PropTypes.number,
  value: PropTypes.string,
  coinbase: PropTypes.string,
  firstSeen: PropTypes.string,
  dateMs: PropTypes.string,
  blockTime: PropTypes.string,
  blockHash: PropTypes.string,
  blockHeight: PropTypes.number,
  input: PropTypes.arrayOf(CoinAggregate_t),
  output: PropTypes.arrayOf(CoinAggregate_t),
});
const Coins_t = module.exports.Coins_t = PropTypes.exact({
  address: PropTypes.string,
  mintTxid: PropTypes.string,
  mintIndex: PropTypes.number,
  dateMs: PropTypes.string,
  value: PropTypes.string,
  coinbase: PropTypes.oneOf([0,1,2]),
  voteFor: PropTypes.string,
  voteAgainst: PropTypes.string,
  seenTime: PropTypes.string,
  mintBlockHash: PropTypes.string,
  mintHeight: PropTypes.number,
  mintTime: PropTypes.string,
  spentTxid: PropTypes.string,
  spentTxinNum: PropTypes.number,
  spentBlockHash: PropTypes.string,
  spentHeight: PropTypes.number,
  spentTime: PropTypes.string,
  spentSequence: PropTypes.number,
  prevState: PropTypes.oneOf(["nothing","mempool","block","spending","spent","burned"]),
  currentState: PropTypes.oneOf(["mempool","block","spending","spent","burned"]),
});
const RpcError_t = module.exports.RpcError_t = PropTypes.exact({
  code: PropTypes.number,
  error: PropTypes.string,
  fn: PropTypes.string,
});
const Apiv1_enabledChains_result = module.exports.Apiv1_enabledChains_result = PropTypes.arrayOf(PropTypes.exact({
  chain: PropTypes.string,
  network: PropTypes.string,
}));
const Apiv1_enabledChains = module.exports.Apiv1_enabledChains = PropTypes.oneOfType([RpcError_t, Apiv1_enabledChains_result]);
const Apiv1_richlist_resultElem = module.exports.Apiv1_richlist_resultElem = PropTypes.exact({
  address: PropTypes.string,
  balance: PropTypes.string,
});
const Apiv1_richlist_result = module.exports.Apiv1_richlist_result = PropTypes.exact({
  results: PropTypes.arrayOf(Apiv1_richlist_resultElem),
  prev: PropTypes.string,
  next: PropTypes.string,
});
const Apiv1_richlist = module.exports.Apiv1_richlist = PropTypes.oneOfType([RpcError_t, Apiv1_richlist_result]);
const Apiv1_ns_result = module.exports.Apiv1_ns_result = PropTypes.exact({
  networkSteward: PropTypes.string,
  votesAgainst: PropTypes.string,
  votesNeeded: PropTypes.string,
});
const Apiv1_ns = module.exports.Apiv1_ns = PropTypes.oneOfType([RpcError_t, Apiv1_ns_result]);
const Apiv1_nsCandidates_resultElem = module.exports.Apiv1_nsCandidates_resultElem = PropTypes.exact({
  candidate: PropTypes.string,
  votesFor: PropTypes.string,
  votesAgainst: PropTypes.string,
});
const Apiv1_nsCandidates_result = module.exports.Apiv1_nsCandidates_result = PropTypes.exact({
  results: PropTypes.arrayOf(Apiv1_nsCandidates_resultElem),
  prev: PropTypes.string,
  next: PropTypes.string,
});
const Apiv1_nsCandidates = module.exports.Apiv1_nsCandidates = PropTypes.oneOfType([RpcError_t, Apiv1_nsCandidates_result]);
const Apiv1_address_result = module.exports.Apiv1_address_result = AddrStats_t;
const Apiv1_address = module.exports.Apiv1_address = PropTypes.oneOfType([RpcError_t, Apiv1_address_result]);
const Apiv1_addressCoins_resultElem = module.exports.Apiv1_addressCoins_resultElem = TransactionDetail_t;
const Apiv1_addressCoins_result = module.exports.Apiv1_addressCoins_result = PropTypes.exact({
  results: PropTypes.arrayOf(Apiv1_addressCoins_resultElem),
  prev: PropTypes.string,
  next: PropTypes.string,
});
const Apiv1_addressCoins = module.exports.Apiv1_addressCoins = PropTypes.oneOfType([RpcError_t, Apiv1_addressCoins_result]);
const Apiv1_addressIncome_resultElem = module.exports.Apiv1_addressIncome_resultElem = PropTypes.exact({
  date: PropTypes.string,
  received: PropTypes.string,
});
const Apiv1_addressIncome_result = module.exports.Apiv1_addressIncome_result = PropTypes.exact({
  results: PropTypes.arrayOf(Apiv1_addressIncome_resultElem),
  prev: PropTypes.string,
  next: PropTypes.string,
});
const Apiv1_addressIncome = module.exports.Apiv1_addressIncome = PropTypes.oneOfType([RpcError_t, Apiv1_addressIncome_result]);
const Apiv1_block_result = module.exports.Apiv1_block_result = Block_t;
const Apiv1_block = module.exports.Apiv1_block = PropTypes.oneOfType([RpcError_t, Apiv1_block_result]);
const Apiv1_blockCoins_resultElem = module.exports.Apiv1_blockCoins_resultElem = TransactionDetail_t;
const Apiv1_blockCoins_result = module.exports.Apiv1_blockCoins_result = PropTypes.exact({
  results: PropTypes.arrayOf(Apiv1_blockCoins_resultElem),
  prev: PropTypes.string,
  next: PropTypes.string,
});
const Apiv1_blockCoins = module.exports.Apiv1_blockCoins = PropTypes.oneOfType([RpcError_t, Apiv1_blockCoins_result]);
const Apiv1_chainUp_resultElem = module.exports.Apiv1_chainUp_resultElem = Block_t;
const Apiv1_chainUp_result = module.exports.Apiv1_chainUp_result = PropTypes.exact({
  results: PropTypes.arrayOf(Apiv1_chainUp_resultElem),
  prev: PropTypes.string,
  next: PropTypes.string,
});
const Apiv1_chainUp = module.exports.Apiv1_chainUp = PropTypes.oneOfType([RpcError_t, Apiv1_chainUp_result]);
const Apiv1_chainDown_resultElem = module.exports.Apiv1_chainDown_resultElem = Block_t;
const Apiv1_chainDown_result = module.exports.Apiv1_chainDown_result = PropTypes.exact({
  results: PropTypes.arrayOf(Apiv1_chainDown_resultElem),
  prev: PropTypes.string,
  next: PropTypes.string,
});
const Apiv1_chainDown = module.exports.Apiv1_chainDown = PropTypes.oneOfType([RpcError_t, Apiv1_chainDown_result]);
const Apiv1_tx_result = module.exports.Apiv1_tx_result = TransactionDetail_t;
const Apiv1_tx = module.exports.Apiv1_tx = PropTypes.oneOfType([RpcError_t, Apiv1_tx_result]);
const Apiv1_txDetail_result = module.exports.Apiv1_txDetail_result = PropTypes.exact({
  inputs: PropTypes.arrayOf(Coins_t),
  outputs: PropTypes.arrayOf(Coins_t),
  prev: PropTypes.string,
  next: PropTypes.string,
});
const Apiv1_txDetail = module.exports.Apiv1_txDetail = PropTypes.oneOfType([RpcError_t, Apiv1_txDetail_result]);
const Apiv1_packetcryptBlock_result = module.exports.Apiv1_packetcryptBlock_result = PropTypes.exact({
  blockBits: PropTypes.number,
  blockEncryptions: PropTypes.number,
});
const Apiv1_packetcryptBlock = module.exports.Apiv1_packetcryptBlock = PropTypes.oneOfType([RpcError_t, Apiv1_packetcryptBlock_result]);
const Apiv1_packetcryptStats_resultElem = module.exports.Apiv1_packetcryptStats_resultElem = PropTypes.exact({
  date: PropTypes.string,
  pcVersion: PropTypes.number,
  bitsPerSecond: PropTypes.number,
  encryptionsPerSecond: PropTypes.number,
});
const Apiv1_packetcryptStats_result = module.exports.Apiv1_packetcryptStats_result = PropTypes.exact({
  results: PropTypes.arrayOf(Apiv1_packetcryptStats_resultElem),
  prev: PropTypes.string,
  next: PropTypes.string,
});
const Apiv1_packetcryptStats = module.exports.Apiv1_packetcryptStats = PropTypes.oneOfType([RpcError_t, Apiv1_packetcryptStats_result]);

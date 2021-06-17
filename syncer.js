/*@flow*/
/* global BigInt */
// SPDX-License-Identifier: MIT
'use strict';
const Util = require('util');

const nThen = require('nthen');
const RpcClient = require('bitcoind-rpc');

const ClickHouse2 = require('./lib/clickhouse.js');
const Log = require('./lib/log.js');

const Config = require('./config.js');

/*::
import type { Nthen_WaitFor_t } from 'nthen';
import type {
  ClickHouse_t,
  Table_t
} from './lib/clickhouse.js';
import type { Log_t } from './lib/log.js';

export type Rpc_Client_Res_t<T> = {
    result: T,
    error: Object|null,
    id: string
};
export type Rpc_Client_Request_t = {
    jsonrpc: "1.0"|"2.0",
    id: string,
    method: string,
    params: Array<any>
}
export type Rpc_BlockchainInfo_t = {
    chain: string,
    blocks: number,
    headers: number,
    bestblockhash: string,
    difficulty: number,
    mediantime: number,
    verificationprogress: number,
    initialblockdownload: bool,
    chainwork: string,
    size_on_disk: number,
    pruned: bool,
    softforks: Array<any>
};
export type Rpc_Client_Rpc_t<T> = (err: ?Error, ret: ?Rpc_Client_Res_t<T>) => void;
export type Rpc_Client_t = {
    getBlockchainInfo: (Rpc_Client_Rpc_t<Rpc_BlockchainInfo_t>)=>void,
    submitBlock: (blk: string, cb:Rpc_Client_Rpc_t<any>)=>void,
    getBlock: (hash: string, bool, bool, cb:Rpc_Client_Rpc_t<any>)=>void,
    getBlockHash: (num: number, cb:Rpc_Client_Rpc_t<string>)=>void,
    configureMiningPayouts: (po:{[string]:number}, cb:Rpc_Client_Rpc_t<any>)=>void,
    getRawTransaction: (hash: string, verbose: number, cb:Rpc_Client_Rpc_t<any>)=>void,

    batch: (()=>void, (err: ?Error, ret: ?Rpc_Client_Res_t<any>)=>void)=>void,
    batchedCalls: ?Rpc_Client_Request_t
};
type BlockList_t = {
  add: (RpcBlock_t)=>void,
  blocks: ()=>Array<RpcBlock_t>,
  txio: ()=>number,
};

type Context_t = {
  ch: ClickHouse_t,
  btc: Rpc_Client_t,
  snclog: Log_t,
  rpclog: Log_t,
  chain: string,
  recompute: bool,
  lw: Nthen_WaitFor_t, // not the same thing but same function signature
  mut: {
    mempool: Array<string>,
    tip: Tables.chain_t,

    gettingBlocks: bool,
    blockList: ?BlockList_t,
  }
};
type BigInt_t = number;
type BigIntConstructor_t = (number|string)=>BigInt_t;
const BigInt = (({}:any):BigIntConstructor_t);

type RpcVote_t = {
  for?: string,
  against?: string,
};

type RpcTxout_t = {
  value: number,
  svalue: string,
  n: number,
  address: string,
  vote?: RpcVote_t,
};
type RpcTxinCoinbase_t = {
  coinbase: string,
  sequence: number
};
type RpcTxinNormal_t = {
  txid: string,
  vout: number,
  scriptSig: {
    asm: string,
    hex: string
  },
  txinwitness?: Array<string>,
  prevOut: {
    address: string,
    value: number,
    svalue: string,
  },
  "sequence": number
};
type RpcTxin_t = RpcTxinCoinbase_t | RpcTxinNormal_t;
type RpcTx_t = {
  hex: string,
  txid: string,
  hash: string,
  size: number,
  vsize: number,
  version: number,
  locktime: number,
  vin: Array<RpcTxin_t>,
  vout: Array<RpcTxout_t>
};
type RpcBlock_t = {
  hash: string,
  confirmations: number,
  strippedsize: number,
  size: number,
  weight: number,
  height: number,
  version: number,
  versionHex: string,
  merkleroot: string,
  rawtx: Array<RpcTx_t>,
  time: number,
  nonce: number,
  bits: string,
  difficulty: number,
  previousblockhash: string,
  nextblockhash: string,
  packetcryptversion?: number,
  packetcryptanncount?: number,
  packetcryptannbits?: string,
  packetcryptanndifficulty?: number,
  packetcryptblkdifficulty?: number,
  sblockreward: string,
  networksteward?: string,
  blocksuntilretarget: number,
  retargetestimate: ?number,
};
type TxBlock_t = {
  tx: RpcTx_t,
  block: RpcBlock_t|null
};

// generated table types
import * as Tables from './lib/types_gen.js';
*/


const types = ClickHouse2.types;
const engines = ClickHouse2.engines;
const DATABASE = ClickHouse2.database();
const TABLES = {};

TABLES.blocks = DATABASE.add('blocks', ClickHouse2.table/*::<Tables.blocks_t>*/({
  hash: types.FixedString(64),
  height: types.Int32,
  version: types.Int32,
  size: types.Int32,
  merkleRoot: types.FixedString(64),
  time: types.DateTime_number('UTC'),
  nonce: types.UInt32,
  bits: types.UInt32,
  difficulty: types.Float64,
  previousBlockHash: types.FixedString(64),
  transactionCount: types.Int32,
  pcAnnCount: types.Int64,
  pcAnnDifficulty: types.Float64,
  pcBlkDifficulty: types.Float64,
  pcVersion: types.Int8,
  dateMs: types.UInt64,
  networkSteward: types.String,
  blocksUntilRetarget: types.Int32,
  retargetEstimate: types.Float64,
}).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
).withOrder((fields) => [fields.hash]));

TABLES.blocktx = DATABASE.add('blocktx', ClickHouse2.table/*::<Tables.blocktx_t>*/({
  blockHash: types.FixedString(64),
  txid: types.FixedString(64),
  dateMs: types.UInt64
}).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
).withOrder((fields) => [fields.blockHash, fields.txid]));

TABLES.txns = DATABASE.add('txns', ClickHouse2.table/*::<Tables.txns_t>*/({
  txid: types.FixedString(64),
  size: types.Int32,
  vsize: types.Int32,
  version: types.Int32,
  locktime: types.UInt32,
  inputCount: types.Int32,
  outputCount: types.Int32,
  value: types.Int64_string,
  coinbase: types.String,
  firstSeen: types.DateTime_number('UTC'),
  dateMs: types.UInt64
}).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
).withOrder((fields) => [fields.txid]));

TABLES.chain = DATABASE.add('chain', ClickHouse2.table/*::<Tables.chain_t>*/({
  hash: types.FixedString(64),
  height: types.Int32,
  dateMs: types.UInt64,
  state: types.Enum({
    uncommitted: 1,
    complete: 2,
    reverted: 3,
  }),
}).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
).withOrder((fields) => [fields.height]));

// Each state is represented by a 3 bit number, the 'state' field contains both current
// and previous state, the previous state is at bit index zero and the current state is
// at bit index 3. This allows for quick filtering of state sets using a Uint64.
// 3 bits will only support a maximum of 8 states, and transitioning to 4 bits would
// require masking with a 256 bit number.
const STATE_BITS = 3;
const PREV_STATE_MASK = (1 << STATE_BITS) - 1;
const CURRENT_STATE_MASK = PREV_STATE_MASK << STATE_BITS;

// These are all of the states of a transaction output which we consider worth tracking.
// States are represented here as numbers shifted left by STATE_BITS.
const COIN_STATE = [
  // We have not heard anything about this txout
  'nothing',

  // This txout is currently discovered and in the mempool
  'mempool',

  // This txout is confirmed in a block
  'block',

  // This txout is confirmed but there is a valid transaction in the mempool to spend it.
  'spending',

  // This txout has been confirmed in a block and a spend has also been confirmed
  'spent',

  // This txout has burned (network steward payments only)
  'burned',
].reduce((x, e, i) => { x[e] = i << STATE_BITS; return x; }, {});

// MASK is a set of bitmasks for each of the fields which apply the rules for
// state transitions. In order to determine whether a given state transition
// increases the balance, take: ((1 << stateTr) | MASK.balance.add)
// to determine if it decreases the balance, take: ((1 << stateTr) | MASK.balance.sub])
/*::
type Mask_t = { add: number, sub: number };
*/
const MASK /*:{ [string]: Mask_t }*/ = (() => {
  const list = [];
  const states = Object.keys(COIN_STATE);
  for (let sFrom in COIN_STATE) {
    const from = COIN_STATE[sFrom];
    for (let sTo in COIN_STATE) {
      const to = COIN_STATE[sTo];
      const grid = new Array(states.length).fill(0);
      grid[states.indexOf(sTo)] += 1;
      grid[states.indexOf(sFrom)] -= 1;
      list.push({ name: sFrom + '|' + sTo, from, to, grid });
    }
  }
  // console.log(states);
  // list.forEach((x)=>console.log(x.name,new Array(20-x.name.length).join(' '),x.grid));
  const mask = {};
  for (const el of list) {
    const number = BigInt(1) << BigInt(el.to | (el.from >> STATE_BITS));
    el.grid.forEach((n, i) => {
      const x = mask[states[i]] = (mask[states[i]] || { add: BigInt(0), sub: BigInt(0) });
      if (n === 1) {
        x.add |= number;
      } else if (n === -1) {
        x.sub |= number;
      }
    });
  }
  return mask;
})();

// Generate an sql clause to test whether the state transition field matches any of
// a set of states. The following example will return 1 if the spending or spent fields
// should be incremented, -1 if they should be deincremented (rollback) or 0 otherwise.
// matchStateTrClause('stateTr', [MASK.spending, MASK.spent])
const matchStateTrClause = (sTr, masks /*:Array<Mask_t>*/) => `(
  (bitAnd( bitShiftLeft(toUInt64(1), ${sTr}),
    0x${masks.map((m) => m.add).reduce((out, n) => (out | n), BigInt(0)).toString(16)
  } ) != 0) -
  (bitAnd( bitShiftLeft(toUInt64(1), ${sTr}),
    0x${masks.map((m) => m.sub).reduce((out, n) => (out | n), BigInt(0)).toString(16)}
  ) != 0)
)`;

const coins = DATABASE.add('coins', ClickHouse2.table/*::<Tables.coins_t>*/({
  // Key
  address: types.String,
  mintTxid: types.FixedString(64),
  mintIndex: types.Int32,

  // This value is special, it is merged by bit-shifting the old value and adding the new.
  stateTr: types.Int8,
  currentState: types.Alias(
    types.Enum(COIN_STATE),
    `bitAnd(stateTr, ${((1 << STATE_BITS) - 1) << STATE_BITS})`
  ),
  prevState: types.Alias(
    types.Enum(COIN_STATE),
    `bitShiftLeft(bitAnd(stateTr, ${(1 << STATE_BITS) - 1}), ${STATE_BITS})`
  ),
  dateMs: types.UInt64,

  // Seen information (filled when it hits mempool)
  value: types.Int64_string,
  coinbase: types.Int8,
  voteFor: types.String,
  voteAgainst: types.String,
  // This value is special, it is merged using min()
  seenTime: types.DateTime_number('UTC'),

  // Mint information (filled when it enters a block)
  mintBlockHash: types.FixedString(64),
  mintHeight: types.Int32,
  mintTime: types.DateTime_number('UTC'),

  // Spent information (filled when the relevant spend hits a block)
  spentTxid: types.FixedString(64),
  spentTxinNum: types.Int32,
  spentBlockHash: types.FixedString(64),
  spentHeight: types.Int32,
  spentTime: types.DateTime_number('UTC'),
  spentSequence: types.UInt32,
}).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
).withOrder((fields) => [fields.address, fields.mintTxid, fields.mintIndex]));

// Temporary tables for merge-updates

const Table_TxSeen = DATABASE.addTemp('TxSeen', ClickHouse2.table/*::<Tables.TxSeen_t>*/({
  // Key
  address: types.String,
  mintTxid: types.FixedString(64),
  mintIndex: types.Int32,

  stateTr: types.Int8,
  dateMs: types.UInt64,

  // Seen information (filled when it hits mempool)
  value: types.Int64_string,
  voteFor: types.String,
  voteAgainst: types.String,
  coinbase: types.Int8,
  seenTime: types.DateTime_number('UTC'),
}));

// We re-enter the tx-seen data because many times the first time
// we have seen the tx is when it's minted in a block.
const Table_TxMinted = DATABASE.addTemp('TxMinted', ClickHouse2.table/*::<Tables.TxMinted_t>*/({
  // Key
  address: types.String,
  mintTxid: types.FixedString(64),
  mintIndex: types.Int32,

  stateTr: types.Int8,
  dateMs: types.UInt64,

  // Seen information (filled when it hits mempool)
  value: types.Int64_string,
  voteFor: types.String,
  voteAgainst: types.String,
  coinbase: types.Int8,
  seenTime: types.DateTime_number('UTC'),

  // Mint information (filled when it enters a block)
  mintBlockHash: types.FixedString(64),
  mintHeight: types.Int32,
  mintTime: types.DateTime_number('UTC'),
}));

const Table_TxUnMinted = DATABASE.addTemp('TxUnMinted', ClickHouse2.table/*::<Tables.TxUnMinted_t>*/({
  address: types.String,
  mintTxid: types.FixedString(64),
  mintIndex: types.Int32,

  stateTr: types.Int8,
  dateMs: types.UInt64,

  mintBlockHash: types.FixedString(64),
  mintHeight: types.Int32,
}));

// This serves also as the unspent table
const Table_TxSpent = DATABASE.addTemp('TxSpent', ClickHouse2.table/*::<Tables.TxSpent_t>*/({
  address: types.String,
  mintTxid: types.FixedString(64),
  mintIndex: types.Int32,

  stateTr: types.Int8,
  dateMs: types.UInt64,

  // Spent information (filled when the relevant spend hits a block)
  spentTxid: types.FixedString(64),
  spentTxinNum: types.Int32,
  spentBlockHash: types.FixedString(64),
  spentHeight: types.Int32,
  spentTime: types.DateTime_number('UTC'),
  spentSequence: types.UInt32,
}));

const Table_Hashes = DATABASE.addTemp('Hashes', ClickHouse2.table/*::<Tables.Hashes_t>*/({
  hash: types.FixedString(64)
}));

const makeE = (done /*:(?Error)=>void*/) => (w /*:Nthen_WaitFor_t*/) => w((err) => {
  if (err) {
    w.abort();
    return void done(err);
  }
});

const error = (err /*:?Error*/, w /*:Nthen_WaitFor_t*/, done /*:(?Error)=>void*/) => {
  w.abort();
  done(err);
};

const eexistTable = (err) => {
  if (!err) { return false; }
  if (err.message.indexOf("doesn't exist") > -1) { return true; }
  if (err.message.indexOf("Table is dropped") > -1) { return true; }
  return false;
};

const dbCreateVotes = (ctx, done) => {
  const e = makeE(done);
  const selectClause = (s, voteType) => `SELECT
    '${voteType === 'voteFor' ? 'for' : 'against'}' AS type,
    ${voteType} AS candidate,
    value * ${matchStateTrClause(s, [MASK.block])} AS votes
  `;
  nThen((w) => {
    if (!ctx.recompute) { return; }
    ctx.snclog.info('--recompute recomputing votes table');
    nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS votes`, e(w));
    }).nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS votes_for_mv`, e(w));
    }).nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS votes_against_mv`, e(w));
    }).nThen(w());
  }).nThen((w) => {
    ctx.ch.query(`SELECT * FROM votes LIMIT 1`, w((err, _) => {
      if (eexistTable(err)) {
        return;
      }
      // err or already exists
      w.abort();
      return void done(err);
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE TABLE votes (
        type        Enum('for' = 0, 'against' = 1),
        candidate   String,
        votes       SimpleAggregateFunction(sum, Int64)
      ) ENGINE AggregatingMergeTree()
      ORDER BY (type, candidate)
      `, e(w));
  }).nThen((w) => {
    ctx.ch.modify(`INSERT INTO votes ${selectClause(`bitAnd(${CURRENT_STATE_MASK}, stateTr)`, 'voteFor')}
      FROM ${coins.name()}
      FINAL
    `, e(w));
  }).nThen((w) => {
    ctx.ch.modify(`INSERT INTO votes ${selectClause(`bitAnd(${CURRENT_STATE_MASK}, stateTr)`, 'voteAgainst')}
      FROM ${coins.name()}
      FINAL
    `, e(w));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE MATERIALIZED VIEW IF NOT EXISTS votes_for_mv TO votes AS
      ${selectClause('stateTr', 'voteFor')} FROM ${coins.name()}
    `, e(w));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE MATERIALIZED VIEW IF NOT EXISTS votes_against_mv TO votes AS
      ${selectClause('stateTr', 'voteAgainst')} FROM ${coins.name()}
    `, e(w));
  }).nThen((_) => {
    if (ctx.recompute) {
      ctx.snclog.info('--recompute recomputing votes table COMPLETE');
    }
    done();
  });
};

const dbCreateBalances = (ctx, done) => {
  const e = makeE(done);
  const selectClause = (s) => `SELECT
    address,
    value * ${matchStateTrClause(s, [MASK.block])} AS balance
  `;
  nThen((w) => {
    if (!ctx.recompute) { return; }
    ctx.snclog.info('--recompute recomputing balances table');
    nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS balances`, e(w));
    }).nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS balances_mv`, e(w));
    }).nThen(w());
  }).nThen((w) => {
    ctx.ch.query(`SELECT * FROM balances LIMIT 1`, w((err, _) => {
      if (eexistTable(err)) {
        return;
      }
      // err or already exists
      w.abort();
      return void done(err);
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE TABLE balances (
        address        String,
        balance SimpleAggregateFunction(sum, Int64)
      ) ENGINE AggregatingMergeTree()
      ORDER BY address
      `, e(w));
  }).nThen((w) => {
    // We mask the state here so that all states are from previous "nothing"
    // because this is the first time this has ever been seen.
    ctx.ch.modify(`INSERT INTO balances ${selectClause(`bitAnd(${CURRENT_STATE_MASK}, stateTr)`)}
      FROM ${coins.name()}
      FINAL
    `, e(w));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE MATERIALIZED VIEW IF NOT EXISTS balances_mv TO balances AS
      ${selectClause('stateTr')} FROM ${coins.name()}
    `, e(w));
  }).nThen((w) => {
    if (ctx.recompute) {
      ctx.snclog.info('--recompute recomputing balances table COMPLETE');
    }
    done();
  });
};

const dbCreateAddrIncome = (ctx, done) => {
  const e = makeE(done);
  const selectClause = (s) => `SELECT
    address,
    toDate(mintTime) AS date,
    coinbase,
    value * ${matchStateTrClause(s, [
    MASK.block, MASK.spending, MASK.spent, MASK.burned])} AS received
  `;
  nThen((w) => {
    if (!ctx.recompute) { return; }
    ctx.snclog.info('--recompute recomputing addrincome table');
    nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS addrincome`, e(w));
    }).nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS addrincome_mv`, e(w));
    }).nThen(w());
  }).nThen((w) => {
    ctx.ch.query(`SELECT * FROM addrincome LIMIT 1`, w((err, _) => {
      if (eexistTable(err)) {
        return;
      }
      // err or already exists
      w.abort();
      return void done(err);
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE TABLE addrincome (
        address        String,
        date           Date,
        coinbase       Int8,
        received SimpleAggregateFunction(sum, Int64)
      ) ENGINE AggregatingMergeTree()
      ORDER BY (address, date, coinbase)
    `, e(w));
  }).nThen((w) => {
    // We mask the state here so that all states are from previous "nothing"
    // because this is the first time this has ever been seen.
    ctx.ch.modify(`INSERT INTO addrincome ${selectClause(`bitAnd(${CURRENT_STATE_MASK}, stateTr)`)}
      FROM ${coins.name()}
      FINAL
    `, e(w));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE MATERIALIZED VIEW IF NOT EXISTS addrincome_mv TO addrincome AS
      ${selectClause('stateTr')} FROM ${coins.name()}
    `, e(w));
  }).nThen((_) => {
    if (ctx.recompute) {
      ctx.snclog.info('--recompute recomputing balances table COMPLETE');
    }
    done();
  });
};

const dbCreateTxview = (ctx, done) => {
  const fields = {
    unconfirmed: [MASK.mempool],
    received: [MASK.block, MASK.spending, MASK.spent, MASK.burned],
    spending: [MASK.spending],
    spent: [MASK.spent],
    burned: [MASK.burned],
  };
  const e = makeE(done);
  const select = (txid, io, s) => `SELECT
      ${txid}  AS txid,
      '${io}'  AS type,
      address  AS address,
      coinbase,
      ${matchStateTrClause(s, [MASK.spent, MASK.spending])} AS spentcount,
      ${Object.keys(fields).map((k) =>
    `value * ${matchStateTrClause(s, fields[k])} AS ${k}`).join(',')}
  `;
  nThen((w) => {
    if (!ctx.recompute) { return; }
    ctx.snclog.info('--recompute recomputing txview table');
    nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS txview`, e(w));
    }).nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS txview_mv_out`, e(w));
    }).nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS txview_mv_in`, e(w));
    }).nThen(w());
  }).nThen((w) => {
    ctx.ch.query(`SELECT * FROM txview LIMIT 1`, w((err, _) => {
      if (eexistTable(err)) {
        return;
      }
      // err or already exists
      w.abort();
      return void done(err);
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE TABLE txview (
        txid           FixedString(64),
        type           Enum('input' = 0, 'output' = 1),
        address        String,
        coinbase       Int8,
        spentcount     SimpleAggregateFunction(sum, Int64),
        ${Object.keys(fields).map((f) => (
      `${f} SimpleAggregateFunction(sum, Int64)`
    )).join(', ')}
      ) ENGINE AggregatingMergeTree()
      ORDER BY (txid, type, address, coinbase)
      `, w((err, _) => {
      if (err) { return void error(err, w, done); }
    }));
  }).nThen((w) => {
    ctx.ch.modify(`INSERT INTO txview
      ${select('mintTxid', 'output', `bitAnd(${CURRENT_STATE_MASK}, stateTr)`)}
      FROM ${coins.name()}
      FINAL
    `, w((err, _) => {
      if (err) {
        w.abort();
        return void done(err);
      }
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE MATERIALIZED VIEW IF NOT EXISTS txview_mv_out TO txview AS
      ${select('mintTxid', 'output', 'stateTr')}
      FROM ${coins.name()}
    `, w((err, _) => {
      if (err) {
        w.abort();
        return void done(err);
      }
    }));
  }).nThen((w) => {
    ctx.ch.modify(`INSERT INTO txview
      ${select('spentTxid', 'input', `bitAnd(${CURRENT_STATE_MASK}, stateTr)`)}
      FROM ${coins.name()}
      FINAL
      WHERE spentTxid != toFixedString('',64)
    `, w((err, _) => {
      if (err) {
        w.abort();
        return void done(err);
      }
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE MATERIALIZED VIEW IF NOT EXISTS txview_mv_in TO txview AS
      ${select('spentTxid', 'input', 'stateTr')}
      FROM ${coins.name()}
      WHERE spentTxid != toFixedString('',64)
    `, w((err, _) => {
      if (err) {
        w.abort();
        return void done(err);
      }
    }));
  }).nThen((_) => {
    if (ctx.recompute) {
      ctx.snclog.info('--recompute recomputing txview table COMPLETE');
    }
    done();
  });
};

const createChainView = (ctx, done) => {
  const e = makeE(done);
  nThen((w) => {
    if (!ctx.recompute) { return; }
    ctx.snclog.info('--recompute recomputing chain view');
    nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS chain_v`, e(w));
    }).nThen(w());
  }).nThen((w) => {
    ctx.ch.modify(`CREATE VIEW IF NOT EXISTS chain_v AS SELECT
        *
      FROM chain
      WHERE height >= 0
      ORDER BY
        height DESC,
        dateMs DESC
      LIMIT 1 BY height
    `, e(w));
  }).nThen((_) => {
    if (ctx.recompute) {
      ctx.snclog.info('--recompute recomputing chain view COMPLETE');
    }
    done();
  });
};

const dbOptimize = (ctx, done) => {
  let nt = nThen;
  // filter so we don't get any materialized views
  const tables0 = DATABASE.tables();
  const tables = Object.keys(tables0).filter((t) => ('fields' in tables0[t]));
  tables.forEach((t) => {
    nt = nt((w) => {
      ctx.ch.modify(`OPTIMIZE TABLE ${t}`, w((err, _) => {
        if (err) {
          w.abort();
          return void done(err);
        }
      }));
    }).nThen;
  });
  nt((_) => {
    done();
  });
};

// This block must be present in the chain table order to be able to load the genesis block
const phonyBlock = () => ({
  hash: '0000000000000000000000000000000000000000000000000000000000000000',
  height: -1,
  state: 'complete',
  dateMs: +new Date(),
});

const createTables = (ctx, done) => {
  const defaultDb = ctx.ch.withDb('default');
  const e = makeE(done);
  nThen((w) => {
    defaultDb.query('SELECT 1', w((err, ret) => {
      if (err || !ret) { return void error(err, w, done); }
      if (JSON.stringify(ret) !== '[{"1":1}]') {
        return void error(new Error("Unexpected result: " + JSON.stringify(ret)), w, done);
      }
    }));
  }).nThen((w) => {
    defaultDb.modify(`CREATE DATABASE IF NOT EXISTS ${ctx.ch.opts.db}`, w((err, ret) => {
      if (!ret || ret.length) { return void error(err, w, done); }
    }));
  }).nThen((w) => {
    DATABASE.create(ctx.ch, [ClickHouse2.IF_NOT_EXISTS], e(w));
  }).nThen((w) => {
    // Check that we're not being run with db v0
    ctx.ch.query(`SELECT
        count()
      FROM tbl_blk
    `, w((err, _) => {
      if (!err) {
        throw new Error("Incompatible database version, you must resync with a fresh db");
      }
    }));
  }).nThen((w) => {
    // Always make sure we have the phony block in the chain table, otherwise it's impossible
    // to load the genesis because it doesn't link to anything.
    ctx.ch.insert(TABLES.chain, [phonyBlock()], e(w));
  }).nThen((w) => {
    if (!ctx.recompute) { return; }
    ctx.snclog.info('--recompute OPTIMIZE all tables');
    dbOptimize(ctx, e(w));
  }).nThen((w) => {
    createChainView(ctx, e(w));
  }).nThen((w) => {
    dbCreateBalances(ctx, e(w));
  }).nThen((w) => {
    dbCreateTxview(ctx, e(w));
  }).nThen((w) => {
    dbCreateAddrIncome(ctx, e(w));
  }).nThen((w) => {
    dbCreateVotes(ctx, e(w));
  }).nThen((_) => {
    done();
  });
};

const rpcRes = /*::<X>*/(
  done/*:(err:?Error,x:?X)=>void*/
) /*:Rpc_Client_Rpc_t<X>*/ => {
  return (err, ret) => {
    if (err) {
      done(err);
    } else if (!ret) {
      done(new Error("no result"));
    } else if (ret.error) {
      done(ret.error);
    } else if (!ret.result) {
      done(new Error("no ret.result"));
    } else {
      done(null, ret.result);
    }
  };
};

const rpcGetBlockByHash = (ctx, hash /*:string*/, inclTxns, done) => {
  ctx.btc.getBlock(hash, true, inclTxns, rpcRes((err, ret) => {
    if (!ret) { return void done(err); }
    done(null, (ret /*:RpcBlock_t*/));
  }));
};

const rpcGetBlockByHeight = (ctx, height /*:number*/, inclTxns, done) => {
  ctx.btc.getBlockHash(height, rpcRes((err, hash) => {
    if (!hash) { return void done(err); }
    rpcGetBlockByHash(ctx, hash, inclTxns, done);
  }));
};

// getrawmempool
const rpcGetMempool = (ctx, done) => {
  ctx.btc.batch(() => {
    ctx.btc.batchedCalls = {
      jsonrpc: "1.0",
      id: "pkt-explorer-backend",
      method: "getrawmempool",
      params: []
    };
  }, rpcRes((err, ret) => {
    if (!ret) { return void done(err); }
    done(null, (ret /*:Array<string>*/));
  }));
};

const rpcGetTransaction = (ctx, hash /*:string*/, done) => {
  ctx.btc.getRawTransaction(hash, 1, rpcRes((err, ret) => {
    if (!ret) { return void done(err); }
    done(null, ret);
  }));
};

const getTransactionsForHashes = (ctx, hashes, done) => {
  const transactions = [];
  let nt = nThen;
  ctx.snclog.debug(`Getting [${hashes.length}] transactions`);
  hashes.forEach((th) => {
    nt = nt((w) => {
      rpcGetTransaction(ctx, th, w((err, tx) => {
        if (!tx) {
          ctx.snclog.error(`Failed to get transaction [${th}] ` +
            `[${Util.inspect(err)}] will retry later...`);
          return;
        }
        transactions.push(tx);
      }));
    }).nThen;
  });
  nt(() => {
    done(transactions);
  });
};

const convertTxin = (
  txBlock /*:TxBlock_t*/,
  txin /*:RpcTxin_t*/,
  dateMs /*:number*/
) /*:Tables.TxSpent_t*/ => {
  const { tx, block } = txBlock;
  const txinNum = tx.vin.indexOf(txin);
  if (txinNum < 0) { throw new Error(); }
  if (!txin.txid) {
    throw new Error("I can't understand this txin " + JSON.stringify(txin));
  }
  const normaltxin = ((txin /*:any*/) /*:RpcTxinNormal_t*/);
  const address = normaltxin.prevOut.address;
  const out = {
    mintTxid: normaltxin.txid,
    mintIndex: normaltxin.vout,
    address,

    stateTr: (block) ? COIN_STATE.spent : COIN_STATE.spending,

    spentTxid: tx.txid,
    spentTxinNum: txinNum,

    spentBlockHash: block ? block.hash : "",
    spentHeight: block ? block.height : 0,
    spentTime: block ? block.time : 0,
    spentSequence: txin.sequence,

    dateMs: dateMs,
  };
  return out;
};

const getCoinbase = (ctx, txBlock, txout, value) => {
  if (!('coinbase' in txBlock.tx.vin[0])) { return 0; }
  if (ctx.chain !== 'PKT') { return 1; }
  const block = txBlock.block;
  if (!block) { throw new Error("free coinbase transaction is not allowed"); }
  // special network steward payout stuff for PKT
  // detection of a network steward payment is done by looking for any
  // coinbase payment of precisely 51/256ths of the computed block reward.
  const period = Math.floor(block.height / 144000);
  let a = BigInt(1);
  let b = BigInt(1);
  for (let i = 0; i < period; i++) {
    a *= BigInt(9);
    b *= BigInt(10);
  }
  const reward = a * BigInt(4166) * BigInt(0x40000000) / b;
  const nspayout = reward * BigInt(51) / BigInt(256);
  if (value === nspayout) {
    return 2;
  }
  return 1;
};

const convertTxout = (ctx, txBlock /*:TxBlock_t*/, txout /*:RpcTxout_t*/, dateMs) /*:Tables.TxMinted_t*/ => {
  const { tx, block } = txBlock;
  const value = BigInt(txout.svalue);
  const vote = typeof (txout.vote) !== 'undefined' ? txout.vote : {};
  const out = {
    address: txout.address,
    mintTxid: tx.txid,
    mintIndex: txout.n,

    stateTr: (block) ? COIN_STATE.block : COIN_STATE.mempool,
    dateMs: dateMs,

    seenTime: (block) ? block.time : Math.floor(dateMs / 1000),
    value: value.toString(),
    voteFor: vote.for || '',
    voteAgainst: vote.against || '',
    coinbase: getCoinbase(ctx, txBlock, txout, value),
    mintBlockHash: (block) ? block.hash : "",
    mintHeight: (block) ? block.height : -1,
    mintTime: (block) ? block.time : Math.floor(dateMs / 1000),
  };
  return out;
};
/*::
type Tx_t = {
  meta: Tables.txns_t,
  vin: Array<Tables.TxSpent_t>,
  vout: Array<Tables.TxMinted_t>
};
*/
const convertTx = (ctx, txBlock /*:TxBlock_t*/, dateMs) /*:Tx_t*/ => {
  let value = BigInt(0);
  const { tx, block } = txBlock;
  tx.vout.forEach((x) => { value += BigInt(x.svalue); });
  let coinbase = "";
  if (typeof (tx.vin[0].coinbase) === 'string') {
    coinbase = tx.vin[0].coinbase;
  }
  const out = {
    meta: {
      txid: tx.txid,
      size: tx.size,
      vsize: tx.vsize,
      version: tx.version,
      locktime: tx.locktime,
      inputCount: tx.vin.length - Number(coinbase !== ""),
      outputCount: tx.vout.length,
      value: value.toString(),
      coinbase: coinbase,
      firstSeen: (block) ? block.time : Math.floor(dateMs / 1000),
      dateMs,
    },
    vin: tx.vin.filter((txin) => (!('coinbase' in txin))).map((txin) => (
      convertTxin(txBlock, txin, dateMs + 1))),
    vout: tx.vout.map((txin) => (convertTxout(ctx, txBlock, txin, dateMs))),
  };
  return out;
};

const stateMapper = /*::<X>*/(field, sn, tempTable /*:Table_t<X>*/) => {
  if (field === 'stateTr') {
    return `bitShiftRight(${sn}.stateTr, ${STATE_BITS}) +
      ${tempTable.name()}.stateTr AS stateTr`;
  } else if (field === 'seenTime' && tempTable.fields()['seenTime']) {
    return `if(${sn}.seenTime > 0, ${sn}.seenTime, ${tempTable.name()}.seenTime) AS seenTime`;
  }
};

const dbInsertTransactions = (ctx, rawTx /*:Array<TxBlock_t>*/, done /*:(?Error)=>void*/) => {
  const txInputs /*:Array<Tables.TxSpent_t>*/ = [];
  const txOutputs /*:Array<Tables.TxMinted_t>*/ = [];
  const transactions /*:Array<Tables.txns_t>*/ = [];
  const now = +new Date();
  rawTx.forEach((txBlock, i) => {
    const tx = convertTx(ctx, txBlock, now);
    transactions.push(tx.meta);
    Array.prototype.push.apply(txOutputs, tx.vout);
    Array.prototype.push.apply(txInputs, tx.vin);
  });
  const e = makeE(done);
  const keyFields = [coins.fields().address, coins.fields().mintTxid, coins.fields().mintIndex];
  nThen((w) => {
    if (!transactions.length) { return; }
    ctx.ch.insert(TABLES.txns, transactions, e(w));
  }).nThen((w) => {
    if (!txOutputs.length) { return; }
    ctx.ch.mergeUpdate(Table_TxMinted, txOutputs, coins, keyFields, stateMapper, e(w));
  }).nThen((w) => {
    if (!txInputs.length) { return; }
    ctx.ch.mergeUpdate(Table_TxSpent, txInputs, coins, keyFields, stateMapper, e(w));
  }).nThen((_) => {
    done();
  });
};

const rpcBlockToDbBlock = (block /*:RpcBlock_t*/, now) /*:Tables.blocks_t*/ => {
  return {
    hash: block.hash,
    height: block.height,
    version: block.version,
    size: block.size,
    merkleRoot: block.merkleroot,
    time: block.time,
    nonce: block.nonce,
    bits: Number('0x' + block.bits),
    difficulty: block.difficulty,
    previousBlockHash: block.previousblockhash,
    transactionCount: block.rawtx.length,
    pcAnnCount: block.packetcryptanncount || 0,
    pcAnnDifficulty: block.packetcryptanndifficulty || 0,
    pcBlkDifficulty: block.packetcryptblkdifficulty || 0,
    pcVersion: (typeof (block.packetcryptversion) === 'undefined') ? -1 : block.packetcryptversion,
    dateMs: now,
    networkSteward: (typeof (block.networksteward) === 'undefined') ? '' : block.networksteward,
    blocksUntilRetarget: block.blocksuntilretarget,
    retargetEstimate: (typeof (block.retargetestimate) !== 'number') ? 0 : block.retargetestimate,
  };
};

const dbGetChainTip = (ctx, completeOnly, done /*:(?Error, ?Tables.chain_t)=>void*/) => {
  ctx.ch.query(`SELECT
      *
    FROM chain_v
    WHERE state ${completeOnly ? "= 'complete'" : "!= 'reverted'"}
    ORDER BY height DESC
    LIMIT 1
  `, (err, ret) => {
    if (err) {
      done(err);
    } else if (ret && ret.length) {
      done(null, ret[0]);
    } else {
      done(new Error("no data in chain table"));
    }
  });
};

const dbRollback0 = (ch, tempTable, done) => {
  const keyFields = [coins.fields().address, coins.fields().mintTxid, coins.fields().mintIndex];
  const e = makeE(done);
  nThen((w) => {
    // We need to be a little bit careful here:
    // If we just selected all entries in coins with spentBlockHash, we would potentially
    // get old data which was rolled back before (we support resuming rollback after an abort).
    //
    // 1. Grab all of the coin entries where spendBlockHash is hash
    // 2. From these, grab all copies of those coins entries, any updates which were made
    // 3. and filter them by most recently updated
    // 4. and finally strip out all which don't have the right spendBlockHash
    //    since we don't support rollback of blocks deep in the chain, that should be either our
    //    hash or ''
    //
    // Note that we could match on mintTxid+mintIndex and be unique, but address is also always
    // unique and coins is indexed by address so that makes this query WAY faster
    const now = +new Date();
    ch.query(`SELECT
        address,
        mintTxid,
        mintIndex,
        value
      FROM (
        SELECT
            address,
            mintTxid,
            mintIndex,
            spentBlockHash,
            value
        FROM ${coins.name()}
        WHERE (address,mintTxid,mintIndex) IN (
          SELECT
              address,
              mintTxid,
              mintIndex
            FROM ${coins.name()}
            WHERE spentBlockHash IN (SELECT * FROM ${tempTable.name()})
        )
        ORDER BY address, mintTxid, mintIndex, dateMs DESC
        LIMIT 1 BY address, mintTxid, mintIndex
      )
      WHERE spentBlockHash IN (SELECT * FROM ${tempTable.name()})
    `, w((err, ret) => {
      if (err || !ret) {
        w.abort();
        return void done(err);
      }
      const spentToRevert /*:Array<Tables.TxSpent_t>*/ = ret.map((x) => {
        return ({
          address: x.address,
          mintTxid: x.mintTxid,
          mintIndex: x.mintIndex,

          stateTr: COIN_STATE.block,
          dateMs: now,

          spentTxid: "",
          spentTxinNum: 0,
          spentBlockHash: "",
          spentHeight: 0,
          spentTime: 0,
          spentSequence: 0
        } /*:Tables.TxSpent_t*/);
      });
      ch.mergeUpdate(Table_TxSpent, spentToRevert, coins, keyFields, stateMapper, e(w));
    }));
  }).nThen((w) => {
    const now = +new Date();
    // This query works the same way as the one above, but we're looking for matches
    // of the mintBlockHash rather than the spentBlockHash
    ch.query(`SELECT
        address,
        mintTxid,
        mintIndex
      FROM (
        SELECT
            address,
            mintTxid,
            mintIndex,
            mintBlockHash
        FROM ${coins.name()}
        WHERE (address,mintTxid,mintIndex) IN (
          SELECT
              address,
              mintTxid,
              mintIndex
            FROM ${coins.name()}
            WHERE mintBlockHash IN (SELECT * FROM ${tempTable.name()})
        )
        ORDER BY address, mintTxid, mintIndex, dateMs DESC
        LIMIT 1 BY address, mintTxid, mintIndex
      )
      WHERE mintBlockHash IN (SELECT * FROM ${tempTable.name()})
    `, w((err, ret) => {
      if (err || !ret) {
        w.abort();
        return void done(err);
      }
      const mintToRevert /*:Array<Tables.TxUnMinted_t>*/ = ret.map((x) => {
        return {
          address: x.address,
          mintTxid: x.mintTxid,
          mintIndex: x.mintIndex,

          // This allows the possibility of a coinbase transaction ending
          // up in the mempool state, which is invalid by definition, but
          // we don't really have any other way to speak about an orphaned
          // coinbase tx so we might as well accept it like this.
          stateTr: COIN_STATE.mempool,
          dateMs: now,

          mintBlockHash: "",
          mintHeight: 0
        };
      });
      ch.mergeUpdate(Table_TxUnMinted, mintToRevert, coins, keyFields, stateMapper, e(w));
    }));
  }).nThen((_) => {
    done();
  });
};

// First we revert spends, then we revert mints, then we set the chain db back by one.
// If the process stops at any point through this proceedure, it can be safely
// run again because rolling back the same spends and mints again will not have any
// effect.
// hashes should be provided in ascending order and must be the tip of the chain
const dbRollbackTo = (ctx, newTipHeight /*:number*/, done) => {
  const e = makeE(done);
  const ch = ctx.ch.withSession();
  let hashes;

  const dbChain /*:Array<Tables.chain_t>*/ = [];
  nThen((w) => {
    // Don't do anything until we confirm that we're rolling back blocks at the tip
    ch.query(`SELECT
        *
      FROM (SELECT
          *
        FROM chain
        WHERE height > ${newTipHeight}
        ORDER BY (height, dateMs) DESC
        LIMIT 1 BY height
      )
      WHERE state != 'reverted'
    `, w((err, ret) => {
      if (!ret) {
        w.abort();
        return void done(err);
      }
      if (!ret.length) {
        w.abort();
        return void done(new Error(
          `dbRollbackBlock([${newTipHeight}]) does not roll anything back`)
        );
      }
      if (ret[ret.length - 1].height !== newTipHeight + 1) {
        w.abort();
        return void done(new Error(
          `dbRollbackBlock([${newTipHeight}]) only reaches [${ret[ret.length - 1].height}]`)
        );
      }
      ctx.snclog.debug(`ROLLBACK [${ret.length}] blocks`);
      hashes = [];
      for (const ch of ret) {
        ctx.snclog.debug(`Rollback [${ch.hash} @ ${ch.height}]`);
        hashes.push(ch.hash);
        dbChain.push({ hash: ch.hash, height: ch.height, state: 'reverted', dateMs: 0 });
      }
    }));
  }).nThen((w) => {
    ch.withTempTable(Table_Hashes, hashes.map((x) => ({ hash: x })), dbRollback0, e(w));
  }).nThen((w) => {
    // Finally we have rolled everything back, now we can invalidate the entries in the chain table
    const now = +new Date();
    for (const ch of dbChain) { ch.dateMs = now; }
    ctx.ch.insert(TABLES.chain, dbChain, e(w));
  }).nThen((_) => {
    dbGetChainTip(ctx, true, (err, tip) => {
      if (!tip) {
        return void done(err || new Error());
      }
      ctx.snclog.info(`ROLLBACK [${dbChain.length}] blocks ` +
        `new tip [${tip.hash.slice(0, 16)} @ ${tip.height}]`);
      done();
    });
  });
};

const dbNsBurn = (ctx, done) => {
  if (ctx.chain !== 'PKT') { return; }
  const now = +new Date();
  const fields = Object.keys(coins.fields()).filter((f) => (
    coins.fields()[f].type.writable
  )).map((f) => {
    if (f === 'stateTr') {
      return `bitShiftRight(selection.stateTr, ${STATE_BITS}) + ${COIN_STATE.burned} AS stateTr`;
    } else if (f === 'dateMs') {
      return `${now} AS dateMs`;
    } else {
      return `selection.${f} AS ${f}`;
    }
  });
  ctx.ch.modify(`INSERT INTO ${coins.name()} SELECT
      ${fields.join(', ')}
    FROM (
      SELECT
          *,
          currentState
      FROM ${coins.name()}
      WHERE
        coinbase = 2 AND
        mintHeight < (${ctx.mut.tip.height} - 129600)
      ORDER BY mintTxid, mintIndex, dateMs DESC
      LIMIT 1 BY mintTxid, mintIndex
    ) AS selection
    WHERE selection.currentState = ${COIN_STATE.block}
  `, done);
};

// Order is important because it might be stopped mid-way:
// Also dateMs entries are important: 1,2,3 are with one timestamp, 4 uses it's own and
// 5 uses a new one, 5 needs to use a new time in order to replace entries from 3
// 
// 1. t0 insert blkTx entries - purely factual info, can be re-inserted as many times as you want
// 2. t0 insert the blocks - purely factual information
// 3. t0 insert chain entries with state incomplete, this way they will be rolled back
//    if there's a crash while inserting transactions.
// 4. t1 insert new transactions - this triggers state changes (balances, etc)
// 5. t2 re-insert chain entries with state complete
const dbInsertBlocks = (ctx, blocks /*:Array<RpcBlock_t>*/, done) => {
  const now = +new Date();
  const t0 = now;
  const dbBlocks /*:Array<Tables.blocks_t>*/ =
    blocks.map((b) => rpcBlockToDbBlock(b, now));

  let minHeight = Infinity;
  let maxHeight = 0;
  const hashByHeight = {};
  for (let i = 0; i < dbBlocks.length; i++) {
    if (minHeight > dbBlocks[i].height) { minHeight = dbBlocks[i].height; }
    if (maxHeight < dbBlocks[i].height) { maxHeight = dbBlocks[i].height; }
    hashByHeight[dbBlocks[i].height] = dbBlocks[i].hash;
  }
  const dbChain /*:Array<Tables.chain_t>*/ = [];
  for (let i = minHeight; i <= maxHeight; i++) {
    if (!hashByHeight[i]) {
      return void done(
        new Error(`Unable to insert blocks range [${minHeight}-${maxHeight}] ` +
          `because height [${i}] is missing`)
      );
    }
    dbChain.push({ height: i, hash: hashByHeight[i], state: 'uncommitted', dateMs: now });
  }
  const e = makeE(done);
  nThen((w) => {
    // First, we do nothing until we establish that we're building on a complete
    // chain tip, if we're not then this is a crash.
    dbGetChainTip(ctx, false, w((err, tip) => {
      if (!tip) {
        w.abort();
        return void done(err || new Error());
      }
      if (tip.state !== 'complete') {
        w.abort();
        return void done(new Error(`dbInsertBlocks() chain tip state is ${tip.state}`));
      }
      if (tip.height !== minHeight - 1) {
        w.abort();
        return void done(new Error(
          `dbInsertBlocks() minHeight is ${minHeight} but chain tip is ${tip.height}`));
      }
      for (const blk of dbBlocks) {
        if (minHeight !== blk.height) { continue; }
        if (blk.previousBlockHash === tip.hash) {
          ctx.snclog.info(`Adding   [${blocks.length}] blocks\t` +
            `[${hashByHeight[minHeight].slice(0, 16)} @ ${minHeight}] ... ` +
            `[${hashByHeight[maxHeight].slice(0, 16)} @ ${maxHeight}]`);
          return;
        }
        w.abort();
        return void done(new Error(
          `dbInsertBlocks() adding block at height [${minHeight}] to chain tip [${tip.height}] ` +
          `previousBlockHash is [${blk.previousBlockHash}] but chain tip hash is ` +
          `[${tip.hash}]`));
      }
      throw new Error("could not find minHeight in dbBlocks");
    }));
  }).nThen((w) => {
    // 1. Insert the blkTx entries
    const blockTx /*:Array<Tables.blocktx_t>*/ = [];
    blocks.forEach((block) => {
      block.rawtx.forEach((tx) => {
        blockTx.push({
          blockHash: block.hash,
          txid: tx.txid,
          dateMs: now
        });
      });
    });
    if (!blockTx.length) { return; }
    ctx.ch.insert(TABLES.blocktx, blockTx, e(w));
  }).nThen((w) => {
    // 2. insert the blocks themselves
    ctx.ch.insert(TABLES.blocks, dbBlocks, e(w));
  }).nThen((w) => {
    // 3. insert the chain as incomplete
    ctx.ch.insert(TABLES.chain, dbChain, e(w));
  }).nThen((w) => {
    const txBlock = [];
    blocks.forEach((block) => {
      block.rawtx.forEach((tx) => {
        txBlock.push({
          tx: tx,
          block: block
        });
      });
    });
    dbInsertTransactions(ctx, txBlock, e(w));
  }).nThen((w) => {
    const now2 = +new Date();
    // 4. re-insert chain as complete
    for (const b of dbChain) {
      b.dateMs = now2;
      b.state = 'complete';
    }
    ctx.ch.insert(TABLES.chain, dbChain, e(w));
  }).nThen((_) => {
    ctx.snclog.info(`Adding   [${blocks.length}] blocks\t - done ` +
      `\t\t\t\t\t\t\t\t\t\t${Log.logTime(+new Date() - t0)}`);
    done(null);
  });
};

const checkMempool = (ctx, done) => {
  let newTx = [];
  let nextMempool = [];
  let hasMempoolTx = false;
  nThen((w) => {
    rpcGetMempool(ctx, w((err, ret) => {
      if (err || !ret) {
        w.abort();
        return void done(err);
      }
      newTx = ret.filter((x) => ctx.mut.mempool.indexOf(x) === -1);
      nextMempool = ret;
    }));
  }).nThen((w) => {
    if (!newTx.length) {
      // update ctx.mut.mempool to allow entries to *leave* the mempool
      ctx.mut.mempool = nextMempool;
      return;
    }
    getTransactionsForHashes(ctx, newTx, w((txs) => {
      hasMempoolTx = (txs.length > 0);
      dbInsertTransactions(ctx, txs.map((tx) => ({ tx: tx, block: null })), w((err) => {
        if (err) {
          w.abort();
          return void done(err);
        }
        // Filter to allow entries to leave the mempool...
        ctx.mut.mempool = ctx.mut.mempool.filter((x) => nextMempool.indexOf(x) > -1);
        for (const tx of txs) { ctx.mut.mempool.push(tx.txid); }
      }));
    }));
  }).nThen((_) => {
    if (hasMempoolTx) { ctx.snclog.debug(`Mempool synced`); }
    done();
  });
};

const mkBlockList = () /*:BlockList_t*/ => {
  const blocks = [];
  let txio = 0;
  return {
    add: (b) => {
      if (!blocks.length) {
      } else {
        const prev = blocks[blocks.length - 1];
        if (prev.hash !== b.previousblockhash) {
          throw new Error(`${prev.hash} @ ${prev.height} != ${b.previousblockhash} @ ${b.height - 1}`);
        }
      }
      blocks.push(b);
      for (const tx of b.rawtx) {
        txio += tx.vin.length + tx.vout.length;
      }
    },
    blocks: () => blocks,
    txio: () => txio,
  };
};

const getBlocks0 = (ctx, startHash /*:string*/, done) => {
  const blockList = mkBlockList();
  const again = (getHash /*:string*/) => {
    rpcGetBlockByHash(ctx, getHash, true, (err, ret) => {
      if (!ret) {
        ctx.snclog.info("Error downloading blocks " + JSON.stringify(err || null));
        if (err && typeof ((err /*:any*/).code) === 'number' && (err /*:any*/).code === -32603) {
          // not in main chain
          return void done(err);
        }
        setTimeout(() => again(getHash), 10000);
        return;
      }

      blockList.add(ret);
      if (ret.height % 100 === 0) {
        ctx.rpclog.debug(`Block [${ret.height}] [${ret.hash}]`);
      }

      if (ret.confirmations === 1 && !('nextblockhash' in ret)) {
        // We have reached the tip :)
        return void done(null, blockList);
      }

      if (blockList.txio() > 100000 || blockList.blocks().length > 5000) {
        // Nobody is waiting for us, when we hit 100k entries, stop here
        return void done(null, blockList);
      }

      again(ret.nextblockhash);
    });
  };
  again(startHash);
};

const getBlocks = (ctx, startHash /*:string*/, done) => {
  ctx.rpclog.info(`Getting blocks     \t[${startHash.slice(0, 16)}] ...`);
  const t0 = +new Date();
  const speculate = (bl /*:BlockList_t*/) => {
    if (ctx.mut.gettingBlocks) { return; }
    const blocks = bl.blocks();
    if (blocks.length > 0 && 'nextblockhash' in blocks[blocks.length - 1]) {
      ctx.mut.gettingBlocks = true;
      const nextHash = blocks[blocks.length - 1].nextblockhash;
      ctx.rpclog.debug(`Speculative getBlocks [${nextHash.slice(0, 16)}]...`);
      getBlocks0(ctx, nextHash, (err, bl) => {
        ctx.mut.gettingBlocks = false;
        if (err) {
          // error while speculating, nothing to do
          return;
        }
        ctx.mut.blockList = bl;
      });
    }
  };
  const directGetBlocks = () => {
    ctx.rpclog.debug(`Direct getBlocks [${startHash.slice(0, 16)}]...`);
    getBlocks0(ctx, startHash, (err, bl) => {
      if (!bl) {
        // Error getting blocks, fail and let the next cycle fix it
        return void done(err);
      }
      speculate(bl);
      done(null, bl, +new Date() - t0);
    });
  };
  //ctx.snclog.debug("getBlocks("+  startHash+ ")");
  const waitForBlocks = () => {
    if (ctx.mut.gettingBlocks) {
      return void setTimeout(waitForBlocks, 500);
    }
    const bl = ctx.mut.blockList;
    if (bl) {
      const b0 = bl.blocks()[0];
      if (b0 && b0.hash === startHash) {
        ctx.mut.blockList = undefined;
        speculate(bl);
        return void done(null, bl, +new Date() - t0);
      }
      ctx.rpclog.info(`Speculative getBlocks miss...`);
    }
    directGetBlocks();
  };
  waitForBlocks();
};

const rollbackAsNeeded = (ctx, done /*:(?Error, ?string)=>void*/) => {
  rpcGetBlockByHeight(ctx, ctx.mut.tip.height + 1, false, (err, blockMeta) => {
    if (!blockMeta) {
      if (err && ('code' in err) && (err /*:any*/).code === -8) {
        // block number out of range, normal when we reach the tip
        return void done();
      }
      return void done(err);
    } else if (blockMeta.previousblockhash === ctx.mut.tip.hash) {
      // We're in agreement with the chain
      return void done(null, blockMeta.hash);
    }
    ctx.snclog.debug("Disagreement with chain, rollback 1 block");
    dbRollbackTo(ctx, ctx.mut.tip.height - 1, ctx.lw((err) => {
      if (err) {
        return void done(err);
      }
      dbGetChainTip(ctx, true, (err, tip) => {
        if (!tip) {
          return void done(err || new Error());
        }
        ctx.mut.tip = tip;
        // Recurse backward looking for a match...
        rollbackAsNeeded(ctx, done);
      });
    }));
  });
};

const loadGenesis = (ctx, done) => {
  dbGetChainTip(ctx, false, (err, _tip) => {
    if (!err) { return void done(); }
    if (err.message.indexOf('no data in chain table') === -1) {
      return void done(err);
    }
    rpcGetBlockByHeight(ctx, 0, true, (err, blk) => {
      if (!blk) { return void done(err || new Error("blk was undefined")); }
      dbInsertBlocks(ctx, [ blk ], (err) => {
        return void done(err);
      });
    });
  });
};

const startup = (ctx, done) => {
  nThen((w) => {
    ctx.snclog.info(`Getting chain tip`);
    dbGetChainTip(ctx, false, w((err, tip) => {
      if (err) {
        w.abort();
        return void done(err);
      }
      if (tip.state !== 'complete') {
        dbGetChainTip(ctx, true, w((err, ctip) => {
          if (err) {
            w.abort();
            return void done(err);
          }
          const count = tip.height - ctip.height;
          ctx.rpclog.info(`CHAIN TIP UNCOMMITTED - Must rollback [${count}] blocks`);
          dbRollbackTo(ctx, ctip.height, w(ctx.lw((err) => {
            w.abort();
            if (err) {
              return void done(err);
            } else {
              // recurse and we should be fixed...
              return void startup(ctx, done);
            }
          })));
        }));
      } else {
        ctx.snclog.info(`Chain tip is [${tip.hash.slice(0, 16)} @ ${tip.height}]`);
        // tip is complete, we're happy
        ctx.mut.tip = tip;
      }
    }));
  }).nThen((w) => {
    ctx.ch.query(`SELECT
        mintTxid
      FROM coins
      WHERE bitShiftRight(stateTr, ${STATE_BITS}) = ${COIN_STATE.mempool >> STATE_BITS}
    `, w((err, ret) => {
      // CAUTION: This will return entries which were
      // later updated and are nologer in the mempool
      // For the purposes of populating the mempool, this doesn't much
      // matter because these will all be cleared out next time we poll
      // the mempool from the RPC.
      if (err || !ret) {
        // Non-critical error, continue on anyway
        ctx.snclog.error(err);
        w.abort();
        return done();
      }
      ctx.mut.mempool = ret;
    }));
  }).nThen((_) => {
    done();
  });
};

const lockWrapper = () => {
  let lock = false;
  return (f) => {
    if (lock) { throw new Error("Locked function called twice"); }
    lock = true;
    return (...x) => {
      lock = false;
      if (f) {
        return f(...x);
      }
    };
  };
};

const syncChain = (ctx, reinit, done) => {
  let nextHash;
  const e = makeE(done);
  nThen((w) => {
    if (ctx.mut.tip.height > -1 && !reinit) { return; }
    startup(ctx, e(w));
  }).nThen((w) => {
    rollbackAsNeeded(ctx, w((err, nh) => {
      if (err) { return void error(err, w, done); }
      nextHash = nh;
    }));
  }).nThen((w) => {
    // No nextHash means we're at the tip already
    if (!nextHash) {
      ctx.snclog.debug("Chain synced, nothing to do");
      w.abort();
      return void done();
    }
    const again = (startHash) => {
      getBlocks(ctx, startHash, w((err, blockList, timeMs) => {
        if (!blockList) {
          return void error(err, w, done);
        }
        const blocks = blockList.blocks();
        const txio = blockList.txio();
        const topBlock = blocks[blocks.length - 1];
        ctx.rpclog.info(`Got      [${blocks.length}] blocks\t` +
          `[${blocks[0].hash.slice(0, 16)} @ ${blocks[0].height}] ... ` +
          `[${topBlock.hash.slice(0, 16)} @ ${topBlock.height}] ([${txio}] inputs/outputs)\t` +
          `${Log.logTime(timeMs)}`);
        dbInsertBlocks(ctx, blocks, w(ctx.lw((err) => {
          if (err) {
            return void error(err, w, done);
          }
          dbGetChainTip(ctx, false, w((err, tip) => {
            if (err) {
              return void error(err, w, done);
            } else if (tip.state !== 'complete') {
              // This is fatal
              throw new Error(`chain tip [${tip.hash} @ ${tip.height}] in state [${tip.state}]`);
            }
            ctx.mut.tip = tip;
            if (topBlock.confirmations === 1 && !('nextblockhash' in topBlock)) {
              ctx.rpclog.debug(`Block [${topBlock.height}] is the tip`);
              return;
            } else {
              again(topBlock.nextblockhash);
            }
          }));
        })));
      }));
    };
    again(nextHash);
  }).nThen((w) => {
    dbNsBurn(ctx, ctx.lw(e(w)));
  }).nThen((_) => {
    ctx.snclog.debug("Chain synced");
    done();
  });
};

const main = (config, argv) => {
  if (argv.indexOf('--typedef') > -1) {
    const out = ['/*@flow*/', '/*::'];
    out.push(ClickHouse2.GLOBAL.typedef());
    const tables = Object.assign({}, DATABASE.tables(), DATABASE.tempTables());
    Object.keys(tables).forEach((name) => {
      if (typeof (tables[name].typedef) !== 'function') { return; }
      out.push(tables[name].typedef(`${name}_t`));
    });
    out.push('*/');
    console.log(out.join('\n'));
    return;
  }
  const cai = argv.indexOf('--chain');
  const chainName = argv[cai + 1];
  const chain = config.enabledChains[argv[cai + 1]];
  if (typeof (chain) !== 'object') {
    console.error("Usage:  node ./syncer.js --chain PKT/pkt   # Begin syncing on PKT/pkt chain");
    console.error("  Possible values for --chain:  " +
      JSON.stringify(Object.keys(config.enabledChains)));
    console.error("See config.js for more information");
    return;
  }
  const clickhouseConf = JSON.parse(JSON.stringify(config.clickhouse));
  clickhouseConf.db = chain.clickhouseDb;
  clickhouseConf.format = 'JSONEachRow';
  const ctx = (Object.freeze({
    ch: ClickHouse2.create(clickhouseConf),
    btc: (new RpcClient(chain.bitcoinRPC)/*:Rpc_Client_t*/),
    chain: chainName.replace(/\/.*$/, ''),
    rpclog: Log.create('rpc', config.logLevel || 'info'),
    snclog: Log.create('snc', config.logLevel || 'info'),
    recompute: (argv.indexOf('--recompute') > -1),
    lw: lockWrapper(),
    mut: {
      tip: phonyBlock(),
      mempool: [],
      gettingBlocks: false,
      blockList: undefined,
    }
  }) /*:Context_t*/);
  nThen((w) => {
    createTables(ctx, w((err) => {
      if (err) {
        ctx.snclog.error(err);
        process.exit(1);
      }
    }));
  }).nThen((w) => {
    if (ctx.recompute) { return; }
    loadGenesis(ctx, w((err) => {
      if (err) {
        ctx.snclog.error(err);
        process.exit(1);
      }
    }))
  }).nThen((w) => {
    if (ctx.recompute) { return; }

    let c = 0;
    let reinit = false;
    const cycle = () => {
      nThen((w) => {
        c++;
        if ((c % 5) !== 1) { return; }
        syncChain(ctx, reinit, w((err) => {
          if (err) {
            ctx.snclog.error(err);
            reinit = true;
          }
        }));
      }).nThen((w) => {
        checkMempool(ctx, w((err) => {
          if (err) {
            ctx.snclog.error(err);
            reinit = true;
          }
        }));
      }).nThen((_) => {
        setTimeout(w(cycle), 1000);
      }).nThen(w());
    };
    cycle();

  }).nThen((w) => {
    console.log(`Shutting down`);
  });
};
main(Config, process.argv);
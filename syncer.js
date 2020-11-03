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


// Try a repair of the db every 5 minutes
const MS_BETWEEN_REPAIRS = 1000 * 60 * 5;

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
  mut: {
    mempool: Array<string>,
    headHash: string,
    headHeight: number,
    timeOfLastRepair: number,

    gettingBlocks: bool,
    blockList: BlockList_t,
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

const tbl_blk = DATABASE.add('tbl_blk', ClickHouse2.table/*::<Tables.tbl_blk_t>*/({
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
).withOrder((fields) => [ fields.hash ]));

const tbl_blkTx = DATABASE.add('tbl_blkTx', ClickHouse2.table/*::<Tables.tbl_blkTx_t>*/({
  blockHash: types.FixedString(64),
  txid: types.FixedString(64),
  dateMs: types.UInt64
}).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
).withOrder((fields) => [ fields.blockHash, fields.txid ]));

// const mv_txBlk = DATABASE.add('mv_txBlk', ClickHouse2.materializedView({
//   as: ClickHouse2.select(tbl_blkTx).fields((t) => t.fields())
// }).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
// ).withOrder((fields) => [ fields.txid, fields.blockHash ]));

const tbl_tx = DATABASE.add('tbl_tx', ClickHouse2.table/*::<Tables.tbl_tx_t>*/({
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
).withOrder((fields) => [ fields.txid ]));

// Each state is represented by a 3 bit number, the 'state' field contains both current
// and previous state, the previous state is at bit index zero and the current state is
// at bit index 3. This allows for quick filtering of state sets using a Uint64.
// 3 bits will only support a maximum of 8 states, and transitioning to 4 bits would
// require masking with a 256 bit number.
const STATE_BITS = 3;
const PREV_STATE_MASK = (1<<STATE_BITS)-1;
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
].reduce((x,e,i) => { x[e] = i<<STATE_BITS; return x; }, {});

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
    0x${masks.map((m) => m.add).reduce((out, n)=>(out | n), BigInt(0)).toString(16)
  } ) != 0) -
  (bitAnd( bitShiftLeft(toUInt64(1), ${sTr}),
    0x${masks.map((m) => m.sub).reduce((out, n)=>(out | n), BigInt(0)).toString(16)}
  ) != 0)
)`;

const coins = DATABASE.add('coins', ClickHouse2.table/*::<Tables.coins_t>*/({
  // Key
  address:        types.String,
  mintTxid:       types.FixedString(64),
  mintIndex:      types.Int32,

  // This value is special, it is merged by bit-shifting the old value and adding the new.
  stateTr:        types.Int8,
  currentState:   types.Alias(
    types.Enum(COIN_STATE),
    `bitAnd(stateTr, ${((1<<STATE_BITS)-1)<<STATE_BITS})`
  ),
  prevState:       types.Alias(
    types.Enum(COIN_STATE),
    `bitShiftLeft(bitAnd(stateTr, ${(1<<STATE_BITS)-1}), ${STATE_BITS})`
  ),
  dateMs:         types.UInt64,

  // Seen information (filled when it hits mempool)
  value:          types.Int64_string,
  coinbase:       types.Int8,
  voteFor:        types.String,
  voteAgainst:    types.String,
  // This value is special, it is merged using min()
  seenTime:       types.DateTime_number('UTC'),

  // Mint information (filled when it enters a block)
  mintBlockHash:  types.FixedString(64),
  mintHeight:     types.Int32,
  mintTime:       types.DateTime_number('UTC'),

  // Spent information (filled when the relevant spend hits a block)
  spentTxid:      types.FixedString(64),
  spentTxinNum:   types.Int32,
  spentBlockHash: types.FixedString(64),
  spentHeight:    types.Int32,
  spentTime:      types.DateTime_number('UTC'),
  spentSequence:  types.UInt32,
}).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
).withOrder((fields) => [ fields.address, fields.mintTxid, fields.mintIndex ]));

// Temporary tables for merge-updates

const Table_TxSeen = DATABASE.addTemp('TxSeen', ClickHouse2.table/*::<Tables.TxSeen_t>*/({
  // Key
  address:        types.String,
  mintTxid:       types.FixedString(64),
  mintIndex:      types.Int32,

  stateTr:        types.Int8,
  dateMs:         types.UInt64,

  // Seen information (filled when it hits mempool)
  value:          types.Int64_string,
  voteFor:        types.String,
  voteAgainst:    types.String,
  coinbase:       types.Int8,
  seenTime:       types.DateTime_number('UTC'),
}));

// We re-enter the tx-seen data because many times the first time
// we have seen the tx is when it's minted in a block.
const Table_TxMinted = DATABASE.addTemp('TxMinted', ClickHouse2.table/*::<Tables.TxMinted_t>*/({
  // Key
  address:        types.String,
  mintTxid:       types.FixedString(64),
  mintIndex:      types.Int32,

  stateTr:        types.Int8,
  dateMs:         types.UInt64,

  // Seen information (filled when it hits mempool)
  value:          types.Int64_string,
  voteFor:        types.String,
  voteAgainst:    types.String,
  coinbase:       types.Int8,
  seenTime:       types.DateTime_number('UTC'),

  // Mint information (filled when it enters a block)
  mintBlockHash:  types.FixedString(64),
  mintHeight:     types.Int32,
  mintTime:       types.DateTime_number('UTC'),
}));

const Table_TxUnMinted = DATABASE.addTemp('TxUnMinted', ClickHouse2.table/*::<Tables.TxUnMinted_t>*/({
  address:        types.String,
  mintTxid:       types.FixedString(64),
  mintIndex:      types.Int32,

  stateTr:        types.Int8,
  dateMs:         types.UInt64,

  mintBlockHash: types.FixedString(64),
  mintHeight: types.Int32,
}));

// This serves also as the unspent table
const Table_TxSpent = DATABASE.addTemp('TxSpent', ClickHouse2.table/*::<Tables.TxSpent_t>*/({
  address:        types.String,
  mintTxid:       types.FixedString(64),
  mintIndex:      types.Int32,

  stateTr:        types.Int8,
  dateMs:         types.UInt64,

  // This is seen information, but we actually know it and it smooths over bugs
  // if it happens that we didn't get the mint data before the spend event.
  value:          types.Int64_string,

  // Spent information (filled when the relevant spend hits a block)
  spentTxid:      types.FixedString(64),
  spentTxinNum:   types.Int32,
  spentBlockHash: types.FixedString(64),
  spentHeight:    types.Int32,
  spentTime:      types.DateTime_number('UTC'),
  spentSequence:  types.UInt32,
}));


const makeE = (done /*:(?Error)=>void*/) => (w /*:Nthen_WaitFor_t*/) => w((err) => {
  if (err) {
    w.abort();
    return void done(err);
  }
});



const error = (err, w) => {
  throw new Error(err);
};

const eexistTable = (err) => {
  if (!err) { return false; }
  if (err.message.indexOf("doesn't exist") > -1) { return true; }
  if (err.message.indexOf("Table is dropped") > -1) { return true; }
  return false;
};

const dbCreateChain = (ctx, done) => {
  const chain = ClickHouse2.table({
    hash: types.FixedString(64),
    height: types.Int32,
    dateMs: types.UInt64
  }).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
  ).withOrder((fields) => [ fields.height ]);
  chain._.name = 'chain';

  const chainSel = ClickHouse2.select(tbl_blk).fields((t) => {
    return {
      hash: t.fields().hash,
      height: t.fields().height,
      dateMs: t.fields().dateMs
    };
  });

  const chain_mv = ClickHouse2.materializedView({
    to: chain,
    as: chainSel
  });
  chain_mv._.name = 'chain_mv';

  const e = (w) => {
    return w((err, _) => {
      if (!err) { return; }
      w.abort();
      done(err);
    });
  };
  nThen((w) => {
    if (!ctx.recompute) { return; }
    ctx.snclog.info('--recompute recomputing chain table');
    nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS chain`, e(w));
    }).nThen((w) => {
      ctx.ch.modify(`DROP TABLE IF EXISTS chain_mv`, e(w));
    }).nThen(w());
  }).nThen((w) => {
    ctx.ch.query(`SELECT * FROM chain LIMIT 1`, w((err, _) => {
      if (eexistTable(err)) {
        return;
      }
      // err or already exists
      w.abort();
      return void done(err);
    }));
  }).nThen((w) => {
    ctx.ch.modify(chain.queryString(), e(w));
  }).nThen((w) => {
    ctx.ch.modify(`INSERT INTO chain ${chainSel.queryString()}`, e(w));
  }).nThen((w) => {
    ctx.ch.modify(chain_mv.queryString(), e(w));
  }).nThen((w) => {
    if (ctx.recompute) {
      ctx.snclog.info('--recompute recomputing chain table COMPLETE');
    }
    done();
  });
};

const dbCreateVotes = (ctx, done) => {
  const e = makeE(done);
  const selectClause = (s, voteType) => `SELECT
    '${voteType === 'voteFor' ? 'for' : 'against'}' AS type,
    ${voteType} AS candidate,
    value * ${matchStateTrClause(s, [ MASK.block ])} AS votes
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
    ctx.ch.modify(`INSERT INTO votes ${
      selectClause(`bitAnd(${CURRENT_STATE_MASK}, stateTr)`, 'voteFor')}
      FROM ${coins.name()}
      FINAL
    `, e(w));
  }).nThen((w) => {
    ctx.ch.modify(`INSERT INTO votes ${
      selectClause(`bitAnd(${CURRENT_STATE_MASK}, stateTr)`, 'voteAgainst')}
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
    value * ${matchStateTrClause(s, [ MASK.block ])} AS balance
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
      MASK.block, MASK.spending, MASK.spent, MASK.burned ])} AS received
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
    unconfirmed: [ MASK.mempool ],
    received: [ MASK.block, MASK.spending, MASK.spent, MASK.burned ],
    spending: [ MASK.spending ],
    spent: [ MASK.spent ],
    burned: [ MASK.burned ],
  };
  const e = makeE(done);
  const select = (txid, io, s) => `SELECT
      ${txid}  AS txid,
      '${io}'  AS type,
      address  AS address,
      coinbase,
      ${matchStateTrClause(s, [ MASK.spent, MASK.spending ])} AS spentcount,
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
        if (err) { return void error(err, w); }
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

const createTables = (ctx, done) => {
  const defaultDb = ctx.ch.withDb('default');
  nThen((w) => {
    defaultDb.query('SELECT 1', w((err, ret) => {
      if (err || !ret) { return void error(err, w); }
      if (JSON.stringify(ret) !== '[{"1":1}]') {
        return void error(new Error("Unexpected result: " + JSON.stringify(ret)), w);
      }
    }));
  }).nThen((w) => {
    defaultDb.modify(`CREATE DATABASE IF NOT EXISTS ${ctx.ch.opts.db}`, w((err, ret) => {
      if (!ret || ret.length) { return void error(err, w); }
    }));
  }).nThen((w) => {
    DATABASE.create(ctx.ch, [ ClickHouse2.IF_NOT_EXISTS ], w((err) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    if (!ctx.recompute) { return; }
    ctx.snclog.info('--recompute OPTIMIZE all tables');
    dbOptimize(ctx, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    dbCreateChain(ctx, w((err) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    dbCreateBalances(ctx, w((err) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    dbCreateTxview(ctx, w((err) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    dbCreateAddrIncome(ctx, w((err) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    dbCreateVotes(ctx, w((err) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((_) => {
    done();
  });
};

const rpcRes = /*::<X>*/(
  done/*:(err:?Error,x:?X)=>void*/
) /*:Rpc_Client_Rpc_t<X>*/ => {
  return (err, ret) => {
    if (err) {
      if (/503 Too busy/.test(err.message)) {
        // Let this one fall through and just let the retrier keep polling
        return;
      }
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

const retrier = (doThis) => {
  let dead = false;
  const to = setTimeout(() => {
    //console.error("BTC: Retrying request...");
    dead = true;
    retrier(doThis);
  }, 5000);
  doThis((wrapped) => {
    return (...args) => {
      if (dead) { return; }
      dead = true;
      clearTimeout(to);
      wrapped.apply(null, args);
    };
  });
};

const rpcGetBlockByHash = (ctx, hash /*:string*/, done) => {
  retrier((ut) => {
    ctx.btc.getBlock(hash, true, true, ut(rpcRes((err, ret) => {
      if (!ret) { return void done(err); }
      done(null, (ret /*:RpcBlock_t*/));
    })));
  });
};

const rpcGetBlockByHeight = (ctx, height /*:number*/, done) => {
  ctx.btc.getBlockHash(height, rpcRes((err, ret) => {
    if (!ret) { return void done(err); }
    rpcGetBlockByHash(ctx, ret, done);
  }));
};

// getrawmempool
const rpcGetMempool = (ctx, done) => {
  retrier((ut) => {
    ctx.btc.batch(() => {
      ctx.btc.batchedCalls = {
        jsonrpc: "1.0",
        id: "pkt-explorer-backend",
        method: "getrawmempool",
        params: []
      };
    }, ut(rpcRes((err, ret) => {
      if (!ret) { return void done(err); }
      done(null, (ret /*:Array<string>*/));
    })));
  });
};

const rpcGetTransaction = (ctx, hash /*:string*/, done) => {
  retrier((ut) => {
    ctx.btc.getRawTransaction(hash, 1, ut(rpcRes((err, ret) => {
      if (!ret) { return void done(err); }
      done(null, ret);
    })));
  });
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
    value: normaltxin.prevOut.svalue,

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
  const vote = typeof(txout.vote) !== 'undefined' ? txout.vote : {};
  const out = {
    address: txout.address,
    mintTxid: tx.txid,
    mintIndex: txout.n,

    stateTr: (block) ? COIN_STATE.block : COIN_STATE.mempool,
    dateMs: dateMs,

    seenTime:      (block) ? block.time : Math.floor(dateMs/1000),
    value:         value.toString(),
    voteFor:       vote.for || '',
    voteAgainst:   vote.against || '',
    coinbase:      getCoinbase(ctx, txBlock, txout, value),
    mintBlockHash: (block) ? block.hash : "",
    mintHeight:    (block) ? block.height : -1,
    mintTime:      (block) ? block.time : Math.floor(dateMs/1000),
  };
  return out;
};
/*::
type Tx_t = {
  meta: Tables.tbl_tx_t,
  vin: Array<Tables.TxSpent_t>,
  vout: Array<Tables.TxMinted_t>
};
*/
const convertTx = (ctx, txBlock /*:TxBlock_t*/, dateMs) /*:Tx_t*/ => {
  let value = BigInt(0);
  const { tx, block } = txBlock;
  tx.vout.forEach((x) => { value += BigInt(x.svalue); });
  let coinbase = "";
  if (typeof(tx.vin[0].coinbase) === 'string') {
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
      firstSeen: (block) ? block.time : Math.floor(dateMs/1000),
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

const dbInsertTransactions = (ctx, rawTx /*:Array<TxBlock_t>*/, done) => {
  const txInputs /*:Array<Tables.TxSpent_t>*/ = [];
  const txOutputs /*:Array<Tables.TxMinted_t>*/ = [];
  const transactions /*:Array<Tables.tbl_tx_t>*/ = [];
  const now = +new Date();
  rawTx.forEach((txBlock, i) => {
    const tx = convertTx(ctx, txBlock, now);
    transactions.push(tx.meta);
    Array.prototype.push.apply(txOutputs, tx.vout);
    Array.prototype.push.apply(txInputs, tx.vin);
  });
  const keyFields = [ coins.fields().address, coins.fields().mintTxid, coins.fields().mintIndex ];
  nThen((w) => {
    if (!transactions.length) { return; }
    ctx.ch.insert(tbl_tx, transactions, w((err) => {
      if (err) { throw err; }
    }));
  }).nThen((w) => {
    if (!txOutputs.length) { return; }
    ctx.ch.mergeUpdate(Table_TxMinted, txOutputs, coins, keyFields, stateMapper, w((err) => {
      if (err) { throw err; }
    }));
  }).nThen((w) => {
    if (!txInputs.length) { return; }
    ctx.ch.mergeUpdate(Table_TxSpent, txInputs, coins, keyFields, stateMapper, w((err) => {
      if (err) { throw err; }
    }));
  }).nThen((_) => {
    done();
  });
};

const rpcBlockToDbBlock = (block /*:RpcBlock_t*/, now) /*:Tables.tbl_blk_t*/ => {
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
    pcVersion: (typeof(block.packetcryptversion) === 'undefined') ? -1 : block.packetcryptversion,
    dateMs: now,
    networkSteward: (typeof(block.networksteward) === 'undefined') ? '' : block.networksteward,
    blocksUntilRetarget: block.blocksuntilretarget,
    retargetEstimate: (typeof(block.retargetestimate) !== 'number') ? 0 : block.retargetestimate,
  };
};

// First we revert spends, then we revert mints
// If this is stopped half-way through, it will resume and revert only those
// entries which were not already reverted.
const dbRevertBlocks = (ctx, hashes /*:Array<string>*/, done) => {
  if (!hashes.length) { return void done(); }
  const ch = ctx.ch.withSession();
  const subSelect = `(
    SELECT arrayJoin([${hashes.map((h) => (`toFixedString('${h}',64)`)).join()}])
  )`;
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
        WHERE (mintTxid,mintIndex) IN (
          SELECT
              address,
              mintTxid,
              mintIndex
            FROM ${coins.name()}
            WHERE spentBlockHash IN ${subSelect}
        )
        ORDER BY address, mintTxid, mintIndex, dateMs DESC
        LIMIT 1 BY address, mintTxid, mintIndex
      )
      WHERE spentBlockHash IN ${subSelect}
    `, w((err, ret) => {
      if (err || !ret) {
        w.abort();
        return void done(err);
      }
      const spentToRevert /*:Array<Tables.TxSpent_t>*/ = ret.map((x) => {
        return {
          address: x.address,
          mintTxid: x.mintTxid,
          mintIndex: x.mintIndex,

          stateTr: COIN_STATE.block,
          dateMs: now,

          // We don't strictly need to provide value, but we're reusing Table_TxSpent
          // as our "unspent" merge table and Table_TxSpent has value so we must set it
          // because mergeUpdate will update all fields present in Table_TxSpent.
          value: x.value,

          spentTxid: "",
          spentTxinNum: 0,
          spentBlockHash: "",
          spentHeight: 0,
          spentTime: 0,
          spentSequence: 0
        };
      });
      const keyFields = [
        coins.fields().address, coins.fields().mintTxid, coins.fields().mintIndex
      ];
      ch.mergeUpdate(Table_TxSpent, spentToRevert, coins, keyFields, stateMapper, w((err) => {
        if (err) {
          w.abort();
          done(err);
        }
      }));
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
            WHERE mintBlockHash IN ${subSelect}
        )
        ORDER BY address, mintTxid, mintIndex, dateMs DESC
        LIMIT 1 BY address, mintTxid, mintIndex
      )
      WHERE mintBlockHash IN ${subSelect}
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
      const keyFields = [
        coins.fields().address, coins.fields().mintTxid, coins.fields().mintIndex
      ];
      ch.mergeUpdate(Table_TxUnMinted, mintToRevert, coins, keyFields, stateMapper, w((err) => {
        if (err) {
          w.abort();
          done(err);
        }
      }));
    }));
  }).nThen((w) => {
    done();
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
        mintHeight < (${ctx.mut.headHeight} - 129600)
      ORDER BY mintTxid, mintIndex, dateMs DESC
      LIMIT 1 BY mintTxid, mintIndex
    ) AS selection
    WHERE selection.currentState = ${COIN_STATE.block}
  `, done);
};

// Order is important because it might be stopped mid-way:
// 1. insert blkTx entries, this table only indicates that the tx is in fact included in
//    said block so there is no risk here
// 2. check whether any of the blocks to insert overwrite existing blocks and revert them
// 3. insert new transactions
// 4. insert the block
const dbInsertBlocks = (ctx, blocks /*:Array<RpcBlock_t>*/, done) => {
  const now = +new Date();
  const dbBlocks /*:Array<Tables.tbl_blk_t>*/ =
    blocks.map((b) => rpcBlockToDbBlock(b, now));

  let minHeight = Infinity;
  let maxHeight = 0;
  const hashByHeight = {};
  for (let i = 0; i < dbBlocks.length; i++) {
    if (minHeight > dbBlocks[i].height) { minHeight = dbBlocks[i].height; }
    if (maxHeight < dbBlocks[i].height) { maxHeight = dbBlocks[i].height; }
    hashByHeight[dbBlocks[i].height] = dbBlocks[i].hash;
  }
  const needsRevert = [];
  nThen((w) => {
    const blockTx /*:Array<Tables.tbl_blkTx_t>*/ = [];
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
    ctx.ch.insert(tbl_blkTx, blockTx, w((err) => {
      if (err) { throw err; }
    }));
  }).nThen((w) => {
    ctx.ch.query(`SELECT
        argMax(hash, dateMs) AS hash,
        height
      FROM chain
      WHERE height >= ${minHeight} AND height <= ${maxHeight}
      GROUP BY height
    `, w((err, ret) => {
      if (!err && ret) {
        ret.forEach((bl) => {
          const h = hashByHeight[bl.height];
          if (h && h !== bl.hash) { needsRevert.push(h); }
        });
        return;
      }
      ctx.snclog.error(err);
      w.abort();
      done();
    }));
  }).nThen((w) => {
    dbRevertBlocks(ctx, needsRevert, w((err) => {
      if (err) {
        ctx.snclog.error(err);
        w.abort();
        done();
      }
    }));
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
    dbInsertTransactions(ctx, txBlock, w());
  }).nThen((w) => {
    ctx.ch.insert(tbl_blk, dbBlocks, w((err) => {
      if (err) { throw err; }
    }));
  }).nThen((w) => {
    done();
  });
};

const checkMempool = (ctx, done) => {
  let newTx = [];
  let nextMempool = [];
  let hasMempoolTx = false;
  nThen((w) => {
    rpcGetMempool(ctx, w((err, ret) => {
      if (err || !ret) { throw err; }
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
      for (const tx of txs) {
        hasMempoolTx = true;
        // spam
        //ctx.snclog.debug(`Adding mempool transaction [${tx.txid}]`);
      }
      dbInsertTransactions(ctx, txs.map((tx) => { return { tx: tx, block: null }; }), w(() => {
        // Only log the transactions we actually got into the mempool
        ctx.mut.mempool = ctx.mut.mempool.filter((x) => nextMempool.indexOf(x) > -1);
        for (const tx of txs) { ctx.mut.mempool.push(tx.txid); }
      }));
    }));
  }).nThen((w) => {
    if (hasMempoolTx) { ctx.snclog.debug(`Mempool synced`); }
    done();
  });
};

const repairBlocks = (ctx, done) => {
  const missingBlockNumbers = [];
  ctx.snclog.debug(`repairBlocks() running`);
  nThen((w) => {
    ctx.ch.query(`SELECT
        *
      FROM (
        SELECT
            toInt32(number) AS height
          FROM system.numbers
          LIMIT ${ctx.mut.headHeight}
      )
      WHERE height NOT IN ( SELECT height from chain )
    `, w((err, ret) => {
      if (err) {
        ctx.snclog.error(err);
        w.abort();
        done(err);
      } else if (ret && ret.length) {
        for (const elem of ret) {
          missingBlockNumbers.push(elem.height);
        }
        ctx.snclog.info(`Need to repair block numbers: [${missingBlockNumbers.join()}]`);
      }
    }));
  }).nThen((w) => {
    let nt = nThen;
    const _w = w;
    missingBlockNumbers.forEach((n) => {
      nt = nt((w) => {
        rpcGetBlockByHeight(ctx, n, w((err, ret) => {
          if (ret) {
            ctx.rpclog.debug(`Repairing block [${ret.hash}] [${n}]`);
            dbInsertBlocks(ctx, [ret], w());
          } else {
            ctx.snclog.error(err);
            w.abort();
            _w.abort();
            done(err);
          }
        }));
      }).nThen;
    });
    nt(w());
  }).nThen((w) => {
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

const getBlocks0 = (ctx, startHash /*:string*/) => {
  //ctx.snclog.debug("getBlocks0("+  startHash+ ")");
  if (ctx.mut.gettingBlocks) { return; }
  ctx.mut.gettingBlocks = true;

  const again = (getHash /*:string*/) => {
    rpcGetBlockByHash(ctx, getHash, (err, ret) => {
      if (!ret) {
        ctx.snclog.debug("Error downloading blocks " + JSON.stringify(err || null));
        // We're going to bail out and stop the process now
        ctx.mut.gettingBlocks = false;
        return;
      }

      ctx.mut.blockList.add(ret);
      if (ret.height % 100 === 0) {
        ctx.rpclog.debug(`Block [${ret.height}] [${ret.hash}]`);
      }

      if (ret.confirmations === 1 && !('nextblockhash' in ret)) {
        // We have reached the tip :)
        ctx.mut.gettingBlocks = false;
        return;
      }

      const txInOut = ctx.mut.blockList.txio();
      if (txInOut >= 200000) {
        // Nobody is waiting for us, when we hit 100k entries, stop here
        ctx.mut.gettingBlocks = false;
        return;
      }

      again(ret.nextblockhash);
    });
  };
  again(startHash);
};

const getBlocks = (ctx, startHash /*:string*/, done) => {
  //ctx.snclog.debug("getBlocks("+  startHash+ ")");
  const blockList = ctx.mut.blockList;
  const blocks = blockList.blocks();
  if (!blocks.length) {
    // nothing found, start a job and wait
    getBlocks0(ctx, startHash);
  } else if (!blocks[blocks.length - 1].nextblockhash) {
    // We're at the tip
    ctx.mut.blockList = mkBlockList();
    return done(null, blocks, blockList.txio());
  } else if ((blockList.txio() < 100000 && blocks.length < 5000) || blocks.length < 2) {
    // We should wait for 50k txio at least, and if there's only one block we should get
    // at least 2 blocks so we can check chain linkage.
    getBlocks0(ctx, blocks[blocks.length - 1].nextblockhash);
  } else {
    ctx.mut.blockList = mkBlockList();
    if (startHash !== blocks[0].hash) { throw new Error("calls to getBlocks are not sequencial"); }

    // Grab the highest block in order to verify linkage
    const topBlock = blocks.pop();
    ctx.mut.blockList.add(topBlock);
    getBlocks0(ctx, topBlock.nextblockhash);

    return done(null, blocks, blockList.txio());
  }
  return void setTimeout(() => { getBlocks(ctx, startHash, done); }, 1000);
};

const findConvergentBlock = (
  ctx,
  startHeight /*:number*/,
  startHash /*:string*/,
  done /*:(?Error, ?{ hash: string, height: number, nextHash: ?string })=>void*/
) => {
  rpcGetBlockByHeight(ctx, startHeight, (err, bret) => {
    if (!bret) {
      return void done(err);
    } else if (bret.hash === startHash || startHeight === 0) {
      // We're in agreement with the chain, or we need to sync from 0
      return void done(null, { hash: bret.hash, height: startHeight, nextHash: bret.nextblockhash });
    }
    ctx.rpclog.info(`FORK [${startHash}] != [${bret.hash}] searching for common block`);
    ctx.ch.query(`SELECT
        height,
        hash
      FROM chain
      WHERE height = ${startHeight - 1}
      ORDER BY dateMs DESC
      LIMIT 1
    `, (err, cret) => {
      if (err) {
        return void done(err);
      } else if (!cret || !cret.length) {
        // nothing found in chain, we need to sync from 0
        return findConvergentBlock(ctx, 0, '', done);
      }
      findConvergentBlock(ctx, cret[0].height, cret[0].hash, done);
    });
  });
};

const syncChain = (ctx, force, done) => {
  let blocks = [];
  let nextHash;
  nThen((w) => {
    if (force) {
      ctx.mut.headHeight = 0;
      ctx.mut.headHash = '';
      return;
    }
    if (ctx.mut.headHash) { return; }
    nThen((w) => {
      ctx.ch.query(`SELECT
          height,
          hash
        FROM chain
        ORDER BY (height, dateMs) DESC
        LIMIT 1
      `, w((err, ret) => {
        if (err) {
          ctx.snclog.error(err);
          w.abort();
          done();
        } else if (ret && ret.length) {
          ctx.mut.headHeight = ret[0].height;
          ctx.mut.headHash = ret[0].hash;
        }
        // Fresh start, we need to sync everything
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
          ctx.snclog.error(err);
          w.abort();
          return done();
        }
        ctx.mut.mempool = ret;
      }));
    }).nThen(w());
  }).nThen((w) => {
    findConvergentBlock(ctx, ctx.mut.headHeight, ctx.mut.headHash, w((err, ret) => {
      if (!ret) {
        ctx.snclog.error(err);
        w.abort();
        return done();
      }
      if (ret.hash !== ctx.mut.headHash || ret.height !== ctx.mut.headHeight) {
        ctx.snclog.info(`Updating block [${ret.hash}] @ [${ret.height}]`);
        ctx.mut.headHeight = ret.height;
        ctx.mut.headHash = ret.hash;
      } else if (!ret.nextHash) {
        // Nothing to be done
        w.abort();
        return done();
      }
      nextHash = ret.nextHash;
    }));
  }).nThen((w) => {
    if (!nextHash) { throw new Error(); }
    const again = (startHash) => {
      getBlocks(ctx, startHash, w((err, blocks, txio) => {
        if (!blocks) {
          return void error(err, w);
        }
        const topBlock = blocks[blocks.length - 1];
        ctx.rpclog.debug(`Got [${blocks.length}] blocks, [${txio}] inputs/outputs`);
        dbInsertBlocks(ctx, blocks, w(() => {
          ctx.mut.headHeight = topBlock.height;
          ctx.mut.headHash = topBlock.hash;
        }));
        if (topBlock.confirmations === 1 && !('nextblockhash' in topBlock)) {
          ctx.rpclog.debug(`Block [${topBlock.height}] is the tip`);
          return;
        } else {
          again(topBlock.nextblockhash);
        }
      }));
    };
    again(nextHash);
  }).nThen((w) => {
    dbNsBurn(ctx, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    if (((+new Date()) - ctx.mut.timeOfLastRepair) > MS_BETWEEN_REPAIRS) {
      // If this calls back with an error, we'll just let it go and try again next cycle.
      repairBlocks(ctx, w());
    }

  //   const again = () => {
  //     syncBlockTx(ctx, w((needMore) => {
  //       if (needMore) {
  //         console.log("Syncing more in 1 seconds");
  //         setTimeout(w(again), 1000);
  //       }
  //     }));
  //   };
  //   again();
  // }).nThen((w) => {
  //   const again = () => {
  //     syncTransactions(ctx, w((needMore) => {
  //       if (needMore) {
  //         console.log("Syncing more in 1 seconds");
  //         setTimeout(w(again), 1000);
  //       }
  //     }));
  //   };
  //   again();
  }).nThen((w) => {
    if (!force) { return; }
    dbOptimize(ctx, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
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
      if (typeof(tables[name].typedef) !== 'function') { return; }
      out.push(tables[name].typedef(`${name}_t`));
    });
    out.push('*/');
    console.log(out.join('\n'));
    return;
  }
  const cai = argv.indexOf('--chain');
  const chainName = argv[cai+1];
  const chain = config.enabledChains[argv[cai+1]];
  if (typeof(chain) !== 'object') {
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
    rpclog: Log.create('rpc'),
    snclog: Log.create('snc'),
    recompute: (argv.indexOf('--recompute') > -1),
    mut: {
      headHash: '',
      headHeight: 0,
      mempool: [],
      timeOfLastRepair: 0,

      gettingBlocks: false,
      blockList: mkBlockList(),
    }
  }) /*:Context_t*/);
  nThen((w) => {
    createTables(ctx, w());
  }).nThen((w) => {
    if (ctx.recompute) { return; }
    const sync = argv.indexOf('--resync') > -1;

    let c = 0;
    const cycle = () => {
      nThen((w) => {
        c++;
        if (c % 5 && !sync) { return; }
        syncChain(ctx, sync, w());
      }).nThen((w) => {
        checkMempool(ctx, w());
      }).nThen((_) => {
        if (sync) { return; }
        setTimeout(w(cycle), 1000);
      }).nThen(w());
    };
    cycle();

  }).nThen((w) => {
    console.log(`Shutting down`);
  });
};
main(Config, process.argv);
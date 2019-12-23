/*@flow*/
/* global BigInt */
// SPDX-License-Identifier: MIT
'use strict';
const nThen = require('nthen');
const RpcClient = require('bitcoind-rpc');

const ClickHouse2 = require('./lib/clickhouse.js');
const Log = require('./lib/log.js');

const Config = require('./config.js');

/*::
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

type Context_t = {
  ch: ClickHouse_t,
  btc: Rpc_Client_t,
  snclog: Log_t,
  rpclog: Log_t,
  chain: string,
  verifiers: Array<(()=>void)=>void>,
  mut: {
    headHash: string,
    headHeight: number
  }
};
type BigInt_t = number;
type BigIntConstructor_t = (number|string)=>BigInt_t;
const BigInt = (({}:any):BigIntConstructor_t);

type RpcTxout_t = {
  value: number,
  n: number,
  scriptPubKey: {
    asm: string,
    hex: string,
    type: string,
    reqSigs?: number,
    addresses?: Array<string>
  }
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
};
type TxBlock_t = {
  tx: RpcTx_t,
  block: RpcBlock_t
};

// generated table types
import * as Tables from './lib/types_gen.js';
*/


const types = ClickHouse2.types;
const engines = ClickHouse2.engines;
const DATABASE = ClickHouse2.database('pkt_insight');

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
  dateMs: types.UInt64
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


// There are a couple of states which are intentionally missing:
// We aren't going to track when a tx has been spent according to a mempool
// transaction because it will cause a lot more updates to the table as all
// transactions are in the mempool for a moment.
// Also we don't consider the possibility of a transaction being "unburned"
// because transactions burn after aging out and we consider that if we receive
// a block, it is valid and it will only be replaced by another block of the same
// height.
const COIN_STATE = {
  // We have not heard anything about this txout
  nothing: 0b000000,

  // This txout is currently discovered and in the mempool
  mempool: 0b001000,

  // This txout is confirmed in a block
  block:   0b010000,

  // This txout has been confirmed in a block and a spend has also been confirmed
  spent:   0b011000,

  // This txout has burned (network steward payments only)
  burned:  0b100000,
};

const FIELDS = [
  // This number rises and falls with the amount of balance in the mempool
  'unconfirmed',

  // This number is the balance which is in blocks and can be be spent
  // This sum should always equal (received - unreceived) - (spent - unspent) - burned
  'balance',

  // This is a counter of everything which has ever been received, it only goes up
  'received',

  // This is a counter of everything which has ever been spent, it only goes up
  'spent',

  // This is a counter of everything which has ever been received but then the block was reverted
  'unreceived',

  // This is a counter of everything which has ever been spent but then the block was reverted
  'unspent',

  // This is a counter of everything which has ever been received and then burned
  'burned'
];
const MASK = { add: {}, sub: {} };
FIELDS.forEach((f) => {
  MASK.add[f] = BigInt(0);
  MASK.sub[f] = BigInt(0);
});

const stateTrans = (from, to, fields) => {
  const number = BigInt(1) << BigInt(to | (from >> 3));
  if (FIELDS.length !== fields.length) { throw new Error(); }
  fields.forEach((n, i) => {
    if (n === 1) {
      MASK.add[FIELDS[i]] |= number;
    } else if (n === -1) {
      MASK.sub[FIELDS[i]] |= number;
    }
  });
  return number;
};

(() => {
  const { nothing, mempool, block, spent, burned } = COIN_STATE;
                              //  U
                              //  N               U
                              //  C   C           N
                              //  O   O   R       R
                              //  N   N   E       E   U
                              //  F   F   C       C   N   B
                              //  I   I   E   S   E   S   U
                              //  R   R   I   P   I   P   R
                              //  M   M   V   E   V   E   N
                              //  E   E   E   N   E   N   E
                              //  D   D   D   T   D   T   D
  stateTrans(nothing, nothing,  [ 0,  0,  0,  0,  0,  0,  0 ]);
  stateTrans(nothing, mempool,  [ 1,  0,  0,  0,  0,  0,  0 ]);
  stateTrans(nothing, block,    [ 0,  1,  1,  0,  0,  0,  0 ]);
  stateTrans(nothing, spent,    [ 0,  0,  1,  1,  0,  0,  0 ]);
  stateTrans(nothing, burned,   [ 0,  0,  0,  0,  0,  0,  1 ]);

  stateTrans(mempool, nothing,  [-1,  0,  0,  0,  0,  0,  0 ]);
  stateTrans(mempool, mempool,  [ 0,  0,  0,  0,  0,  0,  0 ]);
  stateTrans(mempool, block,    [-1,  1,  1,  0,  0,  0,  0 ]);
  stateTrans(mempool, spent,    [-1,  0,  1,  1,  0,  0,  0 ]);
  stateTrans(mempool, burned,   [-1,  0,  0,  0,  0,  0,  1 ]);

  stateTrans(block, nothing,    [ 0, -1,  0,  0,  1,  0,  0 ]);
  stateTrans(block, mempool,    [ 1, -1,  0,  0,  1,  0,  0 ]);
  stateTrans(block, block,      [ 0,  0,  0,  0,  0,  0,  0 ]);
  stateTrans(block, spent,      [ 0, -1,  0,  1,  0,  0,  0 ]);
  stateTrans(block, burned,     [ 0, -1,  0,  0,  0,  0,  1 ]);

  stateTrans(spent, nothing,    [ 0,  0,  0,  0,  0,  1,  0 ]);
  stateTrans(spent, mempool,    [ 1,  0,  0,  0,  0,  1,  0 ]);
  stateTrans(spent, block,      [ 0,  1,  0,  0,  0,  1,  0 ]);
  stateTrans(spent, spent,      [ 0,  0,  0,  0,  0,  0,  0 ]);
  stateTrans(spent, burned,     [ 0,  0,  0,  0,  0,  0,  1 ]);
})();

const coins = DATABASE.add('coins', ClickHouse2.table/*::<Tables.coins_t>*/({
  // Key
  address:        types.String,
  mintTxid:       types.FixedString(64),
  mintIndex:      types.Int32,

  // This value is special, it is merged by bit-shifting the old value and adding the new.
  state:          types.Int8,
  dateMs:         types.UInt64,

  // Seen information (filled when it hits mempool)
  value:          types.Int64_string,
  script:         types.String,
  coinbase:       types.Int8,
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

  state:          types.Int8,
  dateMs:         types.UInt64,

  // Seen information (filled when it hits mempool)
  value:          types.Int64_string,
  script:         types.String,
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

  state:          types.Int8,
  dateMs:         types.UInt64,

  // Seen information (filled when it hits mempool)
  value:          types.Int64_string,
  script:         types.String,
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

  state:          types.Int8,
  dateMs:         types.UInt64,

  mintBlockHash: types.FixedString(64),
  mintHeight: types.Int32,
}));

// This serves also as the unspent table
const Table_TxSpent = DATABASE.addTemp('TxSpent', ClickHouse2.table/*::<Tables.TxSpent_t>*/({
  mintTxid:       types.FixedString(64),
  mintIndex:      types.Int32,

  state:          types.Int8,
  dateMs:         types.UInt64,

  // Spent information (filled when the relevant spend hits a block)
  spentTxid:      types.FixedString(64),
  spentTxinNum:   types.Int32,
  spentBlockHash: types.FixedString(64),
  spentHeight:    types.Int32,
  spentTime:      types.DateTime_number('UTC'),
  spentSequence:  types.UInt32,
}));







const int_mainChain = DATABASE.add('int_mainChain', ClickHouse2.table/*::<Tables.int_mainChain_t>*/({
  hash: types.FixedString(64),
  height: types.Int32,
  dateMs: types.UInt64
}).withEngine((fields) => engines.ReplacingMergeTree(fields.dateMs)
).withOrder((fields) => [ fields.height ]));

const int_mainChain_mv = DATABASE.add('int_mainChain_mv', ClickHouse2.materializedView({
  to: int_mainChain,
  as: ClickHouse2.select(tbl_blk).fields((t) => {
    return {
      hash: t.fields().hash,
      height: t.fields().height,
      dateMs: t.fields().dateMs
    };
  })
}));


const MAINCHAIN_VIEW = `v_mainChain`;
const TIP_VIEW = `v_tip`;

const MISSING_BLK_TX = 'missing_blkTx';
const MISSING_TX =     'missing_tx';
const MISSING_TXOUT =  'missing_txout';
const MISSING_TXIN =  'missing_txin';

const error = (err, w) => {
  throw new Error(err);
};

/*::
type CountCheckerArgs_t = {
  name: string, // name of the view to create
  keyType: string, // FixedString(64)
  authority: {
    tblName: string, // the table which has the authoritative count
    keyName: string, // name of the field which contains the (primary) key
    sumField: string, // name of the field containing the authoritative total
  },
  sum: {
    tblName: string, // name of the table to collect for summing
    keyName: string, // name of the key to the authoritative component
    countField: string, // name of a field to count unique values on
  }
};
*/
const mkCountChecker = (ctx, args/*:CountCheckerArgs_t*/, done) => {
  const { name, keyType } = args;
  const mainTable = `int_${name}`;
  const authorityMVName = `int_${name}_${args.authority.tblName}`;
  const sumMVName = `int_${name}_${args.sum.tblName}`;
  nThen((w) => {
    ctx.ch.modify(`CREATE TABLE IF NOT EXISTS ${mainTable}
      (
        key ${keyType},
        source Enum(
          '${authorityMVName}' = 0,
          '${sumMVName}' = 1
        ),
        ${authorityMVName} Int32,
        ${sumMVName} Int32,
        dateMs UInt64
      ) ENGINE ReplacingMergeTree(dateMs)
      ORDER BY (key, source)
    `, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    const { tblName, keyName, countField } = args.sum;
    ctx.ch.modify(`CREATE MATERIALIZED VIEW IF NOT EXISTS ${sumMVName}
      TO ${mainTable}
      AS (SELECT
        ${keyName} AS key,
        0 AS ${authorityMVName},
        ${countField} AS ${sumMVName},
        max(dateMs) AS dateMs,
        '${sumMVName}' AS source
      FROM ${tblName} GROUP BY ${keyName})
    `, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    const { tblName, keyName, sumField } = args.authority;
    ctx.ch.modify(`CREATE MATERIALIZED VIEW IF NOT EXISTS ${authorityMVName}
      TO ${mainTable}
      AS (SELECT
        ${keyName} AS key,
        ${sumField} AS ${authorityMVName},
        0 AS ${sumMVName},
        dateMs,
        '${authorityMVName}' AS source
      FROM ${tblName})
    `, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE VIEW IF NOT EXISTS v_${name}
      AS (SELECT
        key,
        max(${authorityMVName}),
        max(${sumMVName})
      FROM ${mainTable}
      GROUP BY key
      HAVING max(${authorityMVName}) != max(${sumMVName}))
    `, w((err) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE VIEW IF NOT EXISTS refresh_${mainTable}
      AS (
        SELECT
            ${args.authority.keyName} AS key,
            '${authorityMVName}' AS source,
            ${args.authority.sumField} AS ${authorityMVName},
            0 AS ${sumMVName},
            dateMs
          FROM ${args.authority.tblName}
        UNION ALL
        SELECT
            ${args.sum.keyName} AS key,
            '${sumMVName}' AS source,
            0 AS ${authorityMVName},
            ${args.sum.countField} AS ${sumMVName},
            max(dateMs) AS dateMs
          FROM ${args.sum.tblName} GROUP BY ${args.sum.keyName}
      )
    `, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    done();
  });
  return (done) => {
    ctx.snclog.info(`Resyncing ${name}`);
    nThen((w) => {
      ctx.ch.modify(`INSERT INTO ${mainTable}
        SELECT * FROM refresh_${mainTable}
      `, w((err, _) => {
        if (err) { return void error(err, w); }
      }));
    }).nThen((w) => {
      ctx.ch.query(`SELECT count() FROM v_${name}`, w((err, ret) => {
        if (!ret) { return void error(err, w); }
        ctx.snclog.info(`Resync completed with ${ret[0]['count()']} rows to update.`);
      }));
    }).nThen((w) => {
      done();
    });
  };
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
    ctx.ch.modify(`CREATE TABLE IF NOT EXISTS balances (
        address        String,
        ${FIELDS.map((f) => (
          `${f} SimpleAggregateFunction(sum, Int64)`
        )).join(', ')}
      ) ENGINE AggregatingMergeTree()
      ORDER BY address
    `, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE MATERIALIZED VIEW IF NOT EXISTS balances_mv TO balances AS
      SELECT
          address,
          ${Object.keys(MASK.add).map((k) => (
            `value * (
              (bitAnd( bitShiftLeft(toUInt64(1), state), ${MASK.add[k].toString()} ) != 0) -
              (bitAnd( bitShiftLeft(toUInt64(1), state), ${MASK.sub[k].toString()} ) != 0)
            ) AS ${k}`
          )).join(',\n')}
        FROM ${coins.name()}
  `, w((err, _) => {
    if (err) { return void error(err, w); }
  }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE VIEW IF NOT EXISTS ${MAINCHAIN_VIEW} AS
      SELECT
          argMax(
            ${int_mainChain.fields().hash.name},
            ${int_mainChain.fields().dateMs.name}
          ) AS hash,
          ${int_mainChain.fields().height.name}
        FROM ${int_mainChain.name()}
        GROUP BY ${int_mainChain.fields().height.name}
    `, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    ctx.ch.modify(`CREATE VIEW IF NOT EXISTS ${TIP_VIEW} AS
      SELECT
          ${int_mainChain.fields().height.name},
          ${int_mainChain.fields().hash.name}
        FROM ${int_mainChain.name()}
        ORDER BY (${int_mainChain.fields().height.name},
          ${int_mainChain.fields().dateMs.name}) DESC
        LIMIT 1
    `, w((err, _) => {
      if (err) { return void error(err, w); }
    }));
  }).nThen((w) => {
    ctx.verifiers.push(
      mkCountChecker(ctx, {
        name: MISSING_BLK_TX,
        keyType: tbl_blk.fields().hash.type.ch,
        authority: {
          tblName: tbl_blk.name(),
          keyName: tbl_blk.fields().hash.name,
          sumField: tbl_blk.fields().transactionCount.name,
        },
        sum: {
          tblName: tbl_blkTx.name(),
          keyName: tbl_blkTx.fields().blockHash.name,
          countField: `uniqExact(${tbl_blkTx.fields().txid.name})`
        }
      }, w()));
  }).nThen((w) => {
    ctx.verifiers.push(
      mkCountChecker(ctx, {
        name: MISSING_TXIN,
        keyType: 'FixedString(64)',
        authority: {
          tblName: tbl_tx.name(),
          keyName: 'txid',
          sumField: 'inputCount',
        },
        sum: {
          tblName: coins.name(),
          keyName: coins.fields().spentTxid.name,
          countField: `uniqExact(${coins.fields().spentTxinNum.name})`
        }
      }, w()));
  }).nThen((w) => {
    ctx.verifiers.push(
      mkCountChecker(ctx, {
        name: MISSING_TXOUT,
        keyType: 'FixedString(64)',
        authority: {
          tblName: tbl_tx.name(),
          keyName: 'txid',
          sumField: 'outputCount',
        },
        sum: {
          tblName: coins.name(),
          keyName: coins.fields().mintTxid.name,
          countField: `uniqExact(${coins.fields().mintIndex.name})`
        }
      }, w()));
  }).nThen((w) => {
    ctx.verifiers.push(
      mkCountChecker(ctx, {
        name: MISSING_TX,
        keyType: 'FixedString(64)',
        authority: {
          tblName: tbl_blkTx.name(),
          keyName: 'txid',
          sumField: '1',
        },
        sum: {
          tblName: tbl_tx.name(),
          keyName: 'txid',
          countField: '1'
        }
      }, w()));
  }).nThen((w) => {
    let nt = nThen;
    ctx.verifiers.forEach((v) => {
      nt = nt((w) => {
        v(w());
      }).nThen;
    });
    nt(w());
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

const retrier = (doThis) => {
  let dead = false;
  const to = setTimeout(() => {
    //console.error("BTC: Retrying request...");
    dead = true;
    retrier(doThis);
  }, 1000);
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

const BIG_230 = BigInt(1<<30);
const convertValue = (f /*:number*/) /*:BigInt_t*/ => {
  const fs = f.toString(16);
  const out = BigInt('0x' + fs.replace('.','')) * BIG_230;
  if (fs.indexOf('.') > -1) {
    const bits = BigInt((fs.length - fs.indexOf('.') - 1) * 4);
    return out >> bits;
  }
  return out;
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
  const out = {
    mintTxid: normaltxin.txid,
    mintIndex: normaltxin.vout,

    state: COIN_STATE.spent,

    spentTxid: tx.txid,
    spentTxinNum: txinNum,

    spentBlockHash: block.hash,
    spentHeight: block.height,
    spentTime: block.time,
    spentSequence: txin.sequence,

    dateMs: dateMs,
  };
  return out;
};

const getCoinbase = (ctx, txBlock, txout, value) => {
  if (!('coinbase' in txBlock.tx.vin[0])) { return 0; }
  if (ctx.chain !== 'PKT') { return 1; }
  // special network steward payout stuff for PKT
  // detection of a network steward payment is done by looking for any
  // coinbase payment of precisely 51/256ths of the computed block reward.
  const period = Math.floor(txBlock.block.height / 144000);
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
  let address = '';
  if (!txout.scriptPubKey) {
  } else if (!txout.scriptPubKey.addresses) {
  } else if (!txout.scriptPubKey.addresses[0]) {
  } else {
    address = txout.scriptPubKey.addresses[0];
  }
  const value = convertValue(txout.value);
  const out = {
    address: address,
    mintTxid: tx.txid,
    mintIndex: txout.n,

    state: (block) ? COIN_STATE.block : COIN_STATE.mempool,
    dateMs: dateMs,

    seenTime:      (block) ? block.time : Math.floor(dateMs/1000),
    value:         value.toString(),
    script:        Buffer.from(txout.scriptPubKey.hex, 'hex').toString('base64'),
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
  tx.vout.forEach((x) => { value += convertValue(x.value); });
  let coinbase = "";
  if (typeof(tx.vin[0].coinbase) === 'string') {
    coinbase = tx.vin[0].coinbase;
  }
  const out = {
    meta: {
      txid: tx.txid,
      size: tx.size,
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
  if (field === 'state') {
    return `bitShiftRight(${sn}.state, 3) + ${tempTable.name()}.state AS state`;
  } else if (field === 'seenTime' && tempTable.fields()['seenTime']) {
    return `if(${sn}.seenTime > 0, ${sn}.seenTime, ${tempTable.name()}.seenTime) AS seenTime`;
  }
};

const submitTransactions = (ctx, rawTx /*:Array<TxBlock_t>*/, done) => {
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
  nThen((w) => {
    if (!transactions.length) { return; }
    ctx.ch.insert(tbl_tx, transactions, w((err) => {
      if (err) { throw err; }
    }));
  }).nThen((w) => {
    if (!txOutputs.length) { return; }
    const keyFields = [
      coins.fields().address, coins.fields().mintTxid, coins.fields().mintIndex ];
    ctx.ch.mergeUpdate(Table_TxMinted, txOutputs, coins, keyFields, stateMapper, w((err) => {
      if (err) { throw err; }
    }));
  }).nThen((w) => {
    if (!txInputs.length) { return; }
    // We can't key off of the address because we don't know it, so we must do a table scan.
    const keyFields = [ coins.fields().mintTxid, coins.fields().mintIndex ];
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
    dateMs: now
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
    // We need to be a little bit careful here, because spentTxid can change
    // and we might be receiving old data here. So we need to first query for
    // the appropriate mintTxid/mintIndex based on the MOST RECENT spentBlockHash.
    // Then we can make the update.
    const now = +new Date();
    ch.query(`SELECT
        mintTxid,
        mintIndex
      FROM ${coins.name()}
      WHERE spentBlockHash IN ${subSelect}
      ORDER BY mintTxid, mintIndex, dateMs DESC
      LIMIT 1 BY mintTxid, mintIndex
    `, w((err, ret) => {
      if (err || !ret) {
        w.abort();
        return void done(err);
      }
      const spentToRevert /*:Array<Tables.TxSpent_t>*/ = ret.map((x) => {
        return {
          mintTxid: x.mintTxid,
          mintIndex: x.mintIndex,

          state: COIN_STATE.block,
          dateMs: now,

          spentTxid: "",
          spentTxinNum: 0,
          spentBlockHash: "",
          spentHeight: 0,
          spentTime: 0,
          spentSequence: 0
        };
      });
      const keyFields = [ coins.fields().mintTxid, coins.fields().mintIndex ];
      ch.mergeUpdate(Table_TxSpent, spentToRevert, coins, keyFields, stateMapper, w((err) => {
        if (err) {
          w.abort();
          done(err);
        }
      }));
    }));
  }).nThen((w) => {
    const now = +new Date();
    ch.query(`SELECT
        address,
        mintTxid,
        mintIndex
      FROM ${coins.name()}
      WHERE mintBlockHash IN ${subSelect}
      ORDER BY mintTxid, mintIndex, dateMs DESC
      LIMIT 1 BY mintTxid, mintIndex
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

          state: COIN_STATE.mempool,
          dateMs: now,

          mintBlockHash: "",
          mintHeight: 0
        };
      });
      const keyFields = [
        coins.fields().address, coins.fields().mintTxid, coins.fields().mintIndex ];
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
  const fields = Object.keys(coins.fields()).map((f) => {
    if (f === 'state') {
      return `bitShiftRight(selection.state, 3) + ${COIN_STATE.burned} AS state`;
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
          *
      FROM ${coins.name()}
      WHERE
        coinbase = 2 AND
        mintHeight < (${ctx.mut.headHeight} - 129600)
      ORDER BY mintTxid, mintIndex, dateMs DESC
      LIMIT 1 BY mintTxid, mintIndex
    ) AS selection
    WHERE
      bitShiftRight(selection.state, 3) = ${COIN_STATE.block >> 3}
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
      FROM int_mainChain
      WHERE height >= ${minHeight} AND height <= ${maxHeight}
      GROUP BY ${int_mainChain.fields().height.name}
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
    submitTransactions(ctx, txBlock, w());
  }).nThen((w) => {
    ctx.ch.insert(tbl_blk, dbBlocks, w((err) => {
      if (err) { throw err; }
    }));
  }).nThen((w) => {
    done();
  });
};

const syncChain = (ctx, done) => {
  let blocks = [];
  nThen((w) => {
    if (ctx.mut.headHash) { return; }
    ctx.ch.query(`SELECT * FROM ${TIP_VIEW}`, w((err, ret) => {
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
    const again = () => {
      rpcGetBlockByHeight(ctx, ctx.mut.headHeight, w((err, ret) => {
        // In case of error, we should reset the block height to zero
        if (!ret) {
          if (ctx.mut.headHeight === 0) {
            return void error(err, w);
          } else {
            ctx.rpclog.info(`Unable to get block at height [${ctx.mut.headHeight}] ` +
              "retrying from zero");
            ctx.mut.headHeight = 0;
            ctx.mut.headHash = '';
            return void again();
          }
        }
        if (ret.hash === ctx.mut.headHash) {
          //console.error("Db agrees with chain");
          if (ret.confirmations === 1 && !('nextblockhash' in ret)) {
            // no sync needed
            w.abort();
            done();
          } else {
            ctx.mut.headHash = ret.nextblockhash;
            ctx.mut.headHeight = ret.height + 1;
          }
        } else if (ret.height === 0) {
          // need sync from the beginning (but we're there)
          ctx.mut.headHash = ret.hash;
          ctx.rpclog.info("Syncing chain from the start");
        } else {
          ctx.mut.headHeight = ret.height - 1;
          ctx.mut.headHash = ret.previousblockhash;
          ctx.rpclog.debug(`Probable reorg, retrying from [${ret.height - 1}]`);
        }
      }));
    };
    again();
  }).nThen((w) => {
    ctx.rpclog.debug(`Syncing blocks from [${ctx.mut.headHash}] [${ctx.mut.headHeight}]`);
    const again = () => {
      rpcGetBlockByHash(ctx, ctx.mut.headHash, w((err, ret) => {
        if (!ret) { return void error(err, w); }
        blocks.push(ret);
        if (ret.height % 100 === 0) {
          ctx.rpclog.debug(`Block [${ret.height}] [${ret.hash}]`);
        }
        if (ret.confirmations === 1 && !('nextblockhash' in ret)) {
          // We have reached the tip :)
          ctx.rpclog.debug(`Got [${blocks.length}] blocks`);
          dbInsertBlocks(ctx, blocks, w(() => {
            blocks = [];
          }));
        } else {
          ctx.mut.headHeight = ret.height + 1;
          ctx.mut.headHash = ret.nextblockhash;
          if (blocks.length >= 1000) {
            ctx.rpclog.debug(`Got [${blocks.length}] blocks`);
            dbInsertBlocks(ctx, blocks, w(() => {
              blocks = [];
              again();
            }));
          } else {
            again();
          }
        }
      }));
    };
    again();
  }).nThen((w) => {
    dbNsBurn(ctx, w((err, _) => {
      if (err) { return void error(err, w); }
    }));

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
    verifiers: [],
    mut: {
      headHash: '',
      headHeight: 0,
    }
  }) /*:Context_t*/);
  nThen((w) => {
    createTables(ctx, w());
  }).nThen((w) => {
    const again = () => {
      syncChain(ctx, w(() => {
        setTimeout(w(again), 5000);
      }));
    };
    again();
  }).nThen((w) => {
    console.log(`Shutting down`);
  });
};
main(Config, process.argv);


/*
* detect transactions in mempool
* self-heal when corrupted
*
*/

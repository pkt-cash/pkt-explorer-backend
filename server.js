/*@flow*/
/* global BigInt */
// SPDX-License-Identifier: MIT
'use strict';
const Http = require('http');
const Querystring = require('querystring');

const nThen = require('nthen');
const Bs58Check = require('bs58check');
const Bech32 = require('bech32');
const MkCsvStringifier = require('csv-writer').createObjectCsvStringifier;

const ClickHouse = require('./lib/clickhouse.js');
const Log = require('./lib/log.js');
const Rewards = require('./lib/rewards.js');

const Config = require('./config.js');

/*::
const ConfigExample = require('./config.example.js').enabledChains['PKT/pkt'];
type Config_t = typeof( ConfigExample );
import type { IncomingMessage, ServerResponse } from 'http';
import type { ClickHouse_t } from './lib/clickhouse.js';
import type { Log_t } from './lib/log.js';
import * as Tables from './lib/types_gen.js';
type Context_t = {
  ch: ClickHouse_t,

  // /api/PKT/pkt/
  path: { [string]:{ [string]: { [string]: string } } },
  log: Log_t,
};
type Session_t = {
  ctx: Context_t,
  config: Config_t,
  req: IncomingMessage,
  res: ServerResponse,
  startTime: number,
  ch: ClickHouse_t,
};
type Error_t = {
  code: number,
  error: string,
  fn: string
};
const BigInt = (x:any)=>0;
*/

const complete = (sess /*:Session_t*/, error /*:Error_t|null*/, data) => {
  const timeSpan = ((+new Date()) - sess.startTime) / 1000;
  if (error) {
    sess.res.setHeader('Content-Type', 'application/json');
    sess.res.statusCode = error.code;
    sess.res.end(JSON.stringify(error, null, '\t'));
  } else if (typeof(data) === 'string') {
    sess.res.end(data);
  } else {
    sess.res.setHeader('Content-Type', 'application/json');
    sess.res.end(JSON.stringify(data, (_, x) => {
      // $FlowFixMe - new fancy js stuff
      if (typeof x !== 'bigint') { return x; }
      return x.toString();
    }, '\t'));
  }
  const line = sess.req.method + ' ' + sess.req.url + ' ' + sess.res.statusCode +
    ((error) ? ` (${error.error}) in (${error.fn})` : "");
  sess.ctx.log.debug(line, `${timeSpan} seconds`);
};

const fourOhFour = (sess, error /*:string*/, fn /*:string*/) /*:Error_t*/ => {
  return { code: 404, error, fn };
};

const dbError = (err, fn /*:string*/) /*:Error_t*/ => {
  return { code: 500, error: "Database Error: " + String(err), fn };
};

const fixDate = (d) => {
  if (typeof(d) === 'number') {
    if (d < 4294967296) {
      // less than 2**32, assume this is unix time
      return (new Date(d * 1000)).toISOString();
    }
    return (new Date(d)).toISOString();
  } else if (typeof(d) === 'string') {
    if (d === "") { return ""; }
    if (d === "0000-00-00 00:00:00") { return ""; }
    if (/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(d)) {
      try {
        return (new Date(d + ' UTC')).toISOString();
      } catch (e) {
        throw new Error(`error parsing date ${d}`);
      }
    }
    const dd = new Date(d);
    if (dd.toString() !== 'Invalid Date') {
      return dd.toISOString();
    }
  } else if (typeof(d) === 'undefined') {
    return undefined;
  }
  return "Invalid Date";
};

const fixDates = (list, fields) => {
  for (const elem of list) {
    for (const f of fields) {
      elem[f] = fixDate(elem[f]);
    }
  }
};

const genericCoins = (sess, fn, whereClause, filter) => {
  sess.ch.query(`SELECT
      *,
      toString(mintBlockHash)  AS mintBlockHash,
      toString(spentTxid)      AS spentTxid,
      toString(spentBlockHash) AS spentBlockHash
    FROM (
      SELECT
          *,
          prevState,
          currentState
        FROM coins
        WHERE ${whereClause}
        ORDER BY mintTxid, mintIndex, dateMs DESC
        LIMIT 1 BY mintTxid, mintIndex
    )
    ORDER BY value DESC
  `, (err, rows) => {
    if (err || !rows) {
      return void complete(sess, dbError(err, fn));
    }
    fixDates(rows, ['seenTime','mintTime','spentTime']);
    complete(sess, null, filter(rows));
  });
};

const isCannonicalPositiveIntOrZero = (num) => {
  const n = Number(num);
  if (!isFinite(n)) { return false; }
  if (n < 0) { return false; }
  if (Math.floor(n) !== n) { return false; }
  if (String(n) !== String(num)) { return false; }
  return true;
};

const limitFromPage = (sess, limit, pgnum, path, max) => {
  if (typeof(limit) === 'undefined' || limit === '') { limit = max; }
  if (typeof(pgnum) === 'undefined' || pgnum === '') { pgnum = 1; }
  if (!isCannonicalPositiveIntOrZero(pgnum) ||
    !isCannonicalPositiveIntOrZero(limit) ||
    pgnum === 0 || limit === 0
  ) {
    return void complete(sess, {
      code: 400,
      error: "page number and limit must be positive integers",
      fn: "limitFromPage",
    });
  }
  const pageNumber = parseInt(pgnum, 10);
  const maxLimit = Math.min(max, parseInt(limit, 10));
  let prev = "";
  if (pageNumber > 1) {
    prev = `${path}/${maxLimit}/${pageNumber - 1}`;
  }
  return {
    limit: `${maxLimit * (pageNumber - 1)}, ${maxLimit}`,
    prev: prev,
    maxLimit,
    pageNumber,
    getNext: (rowsLength /*:number|bool*/) => {
      if (rowsLength === false) {
      } else if (typeof(rowsLength) === 'number' && rowsLength < maxLimit) {
      } else {
        return `${path}/${maxLimit}/${pageNumber + 1}`;
      }
      return "";
    }
  };
};

const e = (str) => String(str).replace(/'/g, '_');

const hashOk = (sess, hash, fn) => {
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    complete(sess, fourOhFour(sess, "expecting a hash (32 lower case hex bytes)", fn));
    return false;
  }
  return true;
};

// v1 only
const txDetail1 = (sess, txid, limit, pgnum) => {
  if (!hashOk(sess, txid, 'txDetail')) { return; }
  const lim = limitFromPage(sess, limit, pgnum, `/tx/${txid}/detail`, 500);
  if (!lim) { return; }
  const whereClause = `mintTxid = '${e(txid)}' OR spentTxid = '${e(txid)}'`;
  const filter = (rows) => {
    const out = {
      inputs: [],
      outputs: [],
      prev: lim.prev,
      next: lim.getNext(rows.length)
    };
    const txids = {};
    rows.forEach((row) => {
      delete row.stateTr;
      if (row.mintTxid === txid) {
        txids[row.mintTxid] = 1;
        out.outputs.push(row);
      } else {
        out.inputs.push(row);
      }
    });
    return out;
  };
  genericCoins(sess, "txDetail", whereClause, filter);
};

const txCoins0 = (sess, txid, limit, pgnum) => {
  if (!hashOk(sess, txid, 'txCoins')) { return; }
  const lim = limitFromPage(sess, limit, pgnum, `/tx/${txid}/coins`, 500);
  if (!lim) { return; }
  const whereClause = `mintTxid = '${e(txid)}' OR spentTxid = '${e(txid)}'`;
  const filter = (rows) => {
    const out = {
      txids: [],
      inputs: [],
      outputs: [],
      prev: lim.prev,
      next: lim.getNext(rows.length)
    };
    const txids = {};
    rows.forEach((row) => {
      if (row.mintTxid === txid) {
        txids[row.mintTxid] = 1;
        out.outputs.push(row);
      } else {
        out.inputs.push(row);
      }
      row.value = Number(row.value);
    });
    out.txids = Object.keys(txids);
    return out;
  };
  genericCoins(sess, "txCoins", whereClause, filter);
};

const blockCoins0 = (sess, blockHash, limit, pgnum) => {
  if (!hashOk(sess, blockHash, 'blockCoins')) { return; }
  const lim = limitFromPage(sess, limit, pgnum, `/block/${blockHash}/coins`, 500);
  if (!lim) { return; }
  const subselect = `SELECT
      txid
    FROM tbl_blkTx
    WHERE blockHash = '${e(blockHash)}'
    LIMIT ${lim.limit}`;
  const whereClause = `mintTxid IN (${subselect}) OR spentTxid IN (${subselect})`;
  const filter = (rows) => {
    const out = {
      txids: [],
      inputs: [],
      outputs: [],
      prev: lim.prev,
      next: lim.getNext(rows.length)
    };
    const txids = {};
    rows.forEach((row) => {
      if (row.mintBlockHash === blockHash) {
        txids[row.mintTxid] = 1;
        out.outputs.push(row);
      } else {
        out.inputs.push(row);
      }
      row.value = Number(row.value);
    });
    out.txids = Object.keys(txids);
    return out;
  };
  genericCoins(sess, "blockCoins", whereClause, filter);
};

const _queryBlocks = (sess, fn, whereClause, then) => {
  sess.ch.query(`SELECT
      *
    FROM tbl_blk
    FINAL
    WHERE ${whereClause}
  `, (err, ret) => {
    if (err || !ret) {
      return void complete(sess, dbError(err, fn));
    }
    if (ret.length === 0) {
      return void complete(sess, fourOhFour(sess, "no blocks found", fn));
    }
    fixDates(ret, ['time']);
    ret.sort((a,b) => b.height - a.height);
    return void then(ret);
  });
};

const queryBlocks = (sess, urlq, filter) => {
  // ?since=175564&limit=200&paging=height&direction=-1
  const since = urlq.since ? Number(urlq.since) : NaN;
  const limit = Number(urlq.limit);
  if (isNaN(limit)) {
    return void complete(sess, {
      code: 400,
      error: "you need to specify limit for a block query",
      fn: "queryBlocks"
    });
  }
  _queryBlocks(sess, 'queryBlocks', `hash IN (
    SELECT
        argMax(hash,dateMs) AS hash
      FROM (
          SELECT
            *
          FROM chain
          ${(!isNaN(since)) ? `WHERE height < ${e(since)}` : ''}
          ORDER BY height DESC
          LIMIT ${limit}
      )
      GROUP BY height
  )`, (ret) => {
    complete(sess, null, filter(ret));
  });
};

// used in both api 0 and 1
const queryBlock01 = (sess, whereClause) => {
  _queryBlocks(sess, 'queryBlock', whereClause, (ret) => {
    complete(sess, null, ret[0]);
  });
};

const queryBlockByNumber0 = (sess, number) => {
  _queryBlocks(sess, 'queryBlock', `hash IN (
    SELECT
        hash
      FROM chain
      WHERE height = ${Number(number)}
      ORDER BY dateMs DESC
      LIMIT 1
  )`, (ret) => {
    complete(sess, null, ret[0]);
  });
};

const chain = (sess, up, limit, pgnum) => {
  const lim = limitFromPage(sess, limit, pgnum, `/chain/${(up) ? 'up' : 'down'}`, 100);
  if (!lim) { return; }
  _queryBlocks(sess, 'chain', `hash IN (
    SELECT
        hash
      FROM chain
      FINAL
      ORDER BY height ${(up) ? 'ASC' : 'DESC'}
      LIMIT ${lim.limit}
  )`, (ret) => {
    if (up) {
      ret.sort((a,b) => a.height - b.height);
    } else {
      ret.sort((a,b) => b.height - a.height);
    }
    return void complete(sess, null, {
      results: ret,
      prev: lim.prev,
      next: lim.getNext(ret.length)
    });
  });
};


const packetcryptStats = (sess, limit, pgnum) => {
  const lim = limitFromPage(sess, limit, pgnum, '/packetcrypt/stats', 50);
  if (!lim) { return; }
  sess.ch.query(`SELECT
      toDate(time) AS date,
      any(pcVersion) pcVersion,
      floor(avg(x) / log2(max(pcAnnDifficulty)) / 60 * 1024 * 8 / 2) as bitsPerSecond,
      floor(avg(pcAnnCount * pcAnnDifficulty + pcBlkDifficulty) * 5 / 60) AS encryptionsPerSecond
    FROM (
      SELECT
          time,
          height,
          pcVersion,
          pcBlkDifficulty,
          pcAnnDifficulty,
          pcAnnCount,
          pcAnnCount * log2(pcAnnDifficulty) AS x
        FROM tbl_blk
        ORDER BY height DESC
    )
    GROUP BY date
    ORDER BY date DESC
    LIMIT ${lim.limit}
  `, (err, ret) => {
    if (err || !ret) {
      return void complete(sess, dbError(err, 'packetcryptStats'));
    }
    fixDates(ret, ['date']);
    return void complete(sess, null, {
      results: ret,
      prev: lim.prev,
      next: lim.getNext(ret.length)
    });
  });
};

// This calculation is an estimate, these numbers need to be tuned to match reality.
const BITS_DIVISOR = 18;
const ENCRYPTIONS_DIVISOR = 32;

const packetcryptBlock = (sess, hash) => {
  if (!hashOk(sess, hash, "packetcryptBlock")) { return; }
  let block;
  nThen((w) => {
    _queryBlocks(sess, 'packetcryptBlock', `hash = '${e(hash)}'`, w((ret) => {
      block = ret[0];
    }));
  }).nThen((_) => {
    // FORMAT JSONEachRow is probably needed because the WITH confuses it
    sess.ch.query(`WITH (
        SELECT
            max(pcAnnDifficulty)
          FROM tbl_blk
          WHERE height < ${block.height} and height > ${block.height - 2016}
          LIMIT 10
        ) AS maxDiff
      SELECT
          floor(pcAnnCount * pcAnnDifficulty / maxDiff) * 1024 * 8 / ${BITS_DIVISOR}
            AS blockBits,
          floor(pcAnnCount * pcAnnDifficulty + pcBlkDifficulty) * 5 / ${ENCRYPTIONS_DIVISOR}
            AS blockEncryptions
        FROM tbl_blk
        WHERE hash = '${e(hash)}'
        ORDER BY dateMs DESC
        LIMIT 1
        FORMAT JSONEachRow
    `, (err, ret) => {
      if (err || !ret) {
        return void complete(sess, dbError(err, 'packetcryptBlock'));
      }
      return void complete(sess, null, ret[0]);
    });
  });

};

const richList = (sess, limit, pgnum) => {
  const lim = limitFromPage(sess, limit, pgnum, `/stats/richlist`, 500);
  if (!lim) { return; }
  sess.ch.query(`SELECT
      address,
      sum(balance)     AS balance
    FROM balances
    GROUP BY address
    ORDER BY balance DESC
    LIMIT ${lim.limit}
  `, (err, ret) => {
    if (err || !ret || !ret.length) {
      return void complete(sess, dbError(err, "richList"));
    }
    return void complete(sess, null, {
      results: ret,
      prev: lim.prev,
      next: lim.getNext(ret.length)
    });
  });
};

const addressBalance = (sess, address) => {
  sess.ch.query(`SELECT
      sumIf(value, currentState = 'mempool')      AS unconfirmedReceived,
      balance + spent + burned                    AS confirmedReceived,
      sumIf(value, currentState = 'block')        AS balance,
      sumIf(value, currentState = 'spending')     AS spending,
      sumIf(value, currentState = 'spent')        AS spent,
      sumIf(value, currentState = 'burned')       AS burned,
      countIf(coinbase == 0)                      AS recvCount,
      countIf(coinbase > 0)                       AS mineCount,
      countIf(value, currentState = 'spent')      AS spentCount,
      countIf(value, currentState = 'block')      AS balanceCount,
      sumIf(value, and(mintTime > subtractHours(now(), 24), coinbase > 0))  AS mined24
    FROM (
      SELECT
          any(value)                   AS value,
          argMax(currentState, dateMs) AS currentState,
          any(coinbase)                AS coinbase,
          argMax(mintTime, dateMs)     AS mintTime
        FROM coins
        WHERE address = '${e(address)}'
        GROUP BY (mintTxid,mintIndex)
    )
  `, (err, ret) => {
    if (err || !ret || !ret.length) {
      return void complete(sess, dbError(err, "addressBalance"));
    }
    const val = ret[0];
    val.recvCount = Number(val.recvCount);
    val.spentCount = Number(val.spentCount);
    val.balanceCount = Number(val.balanceCount);
    val.mineCount = Number(val.mineCount);
    return void complete(sess, null, val);
  });
};

const isValidAddress = (config, addr) => {
  try {
    const x = Bs58Check.decode(addr);
    return config.bs58Prefixes.indexOf(x[0]) > -1;
  } catch (e) { }
  try {
    const x = Bech32.decode(addr);
    return x.prefix === config.bech32Prefix;
  } catch (e) { }
  return false;
};

const address1 = (sess, address) => {
  if (!isValidAddress(sess.config, address)) {
    return void complete(sess, { code: 400, error: "Invalid Address", fn: 'address1' }, null);
  }
  addressBalance(sess, address);
};

const queryTx = (sess, whereClause, then) => {
  sess.ch.query(`SELECT
      *
    FROM tbl_tx
    WHERE ${whereClause}
  `, (err, ret) => {
    if (err || !ret) {
      return void complete(sess, dbError(err, "queryTx"));
    } else {
      fixDates(ret, ['firstSeen']);
      then(ret);
    }
  });
};

const txByBlockHash = (sess, blockHash) => {
  if (!hashOk(sess, blockHash, 'txByBlockHash')) { return; }
  queryTx(sess, `txid IN (
    SELECT
      txid
    FROM tbl_blkTx
    WHERE blockHash = '${e(blockHash)}'
  )`, (x) => {
    return void complete(sess, null, x);
  });
};

const Table_txids = ClickHouse.table({
  txid: ClickHouse.types.FixedString(64),
});

/*::
type GetTransactions_Tx_t = Tables.tbl_tx_t & {
  blockHash?: string,
  blockTime?: string,
  blockHeight?: number,
  input: Array<{ address: string, value: string, spentcount: number }>,
  output: Array<{ address: string, value: string, spentcount: number }>,
};
*/

const getTransactions = (sess, whereClause, done) => {
  let txs /*:Array<GetTransactions_Tx_t>*/ = [];
  const byTxid /*:{[string]: GetTransactions_Tx_t}*/ = {};
  let savedError;
  nThen((w) => {
    sess.ch.query(`SELECT
        *
      FROM tbl_tx
      WHERE ${whereClause}
    `, w((err, ret) => {
      if (err || !ret) {
        w.abort();
        return void done(dbError(err, "getTransactions"));
      } else {
        fixDates(ret, ['firstSeen']);
        for (const tx of ret) {
          if (tx.txid in byTxid) { continue; }
          byTxid[tx.txid] = tx;
          txs.push(tx);
        }
      }
    }));
  }).nThen((w) => {
    if (txs.length === 0) { return; }
    const txids = txs.map((x) => ({ txid: x.txid }));
    const ch = sess.ch.withSession();
    // In this case, repeating ourselves with a WHERE shaves 100ms off the query
    ch.withTempTable(Table_txids, txids, (ch, tempTable, done) => {
      nThen((w) => {
        ch.query(`
          SELECT
              time,
              hash,
              height,
              blktx.txid
            FROM (
              SELECT
                  *
                FROM tbl_blkTx
                WHERE txid IN (SELECT * FROM ${tempTable.name()})
                ORDER BY dateMs DESC
                LIMIT 1 BY txid
            ) AS blktx
            ALL INNER JOIN (
              SELECT
                  *
                FROM tbl_blk
                WHERE hash IN (
                  SELECT
                      blockHash
                    FROM tbl_blkTx
                    WHERE txid IN (SELECT * FROM ${tempTable.name()})
                    ORDER BY dateMs DESC
                    LIMIT 1 BY txid
                )
                ORDER BY dateMs DESC
                LIMIT 1 BY hash
            ) AS blk ON blktx.blockHash = blk.hash
            ORDER BY dateMs DESC
            LIMIT 1 BY txid
        `, w((err, ret) => {
          if (err || !ret) {
            w.abort();
            savedError = dbError(err, "getTransactions0");
            return done();
          }
          for (const block of ret) {
            const tx = byTxid[block.txid];
            tx.blockTime = new Date(block.time).toISOString();
            tx.blockHash = block.hash;
            tx.blockHeight = block.height;
          }
        }));
      }).nThen((w) => {
        ch.query(`SELECT
            txid,
            type,
            address,
            spentcount,
            multiIf(spent > 0, spent, spending > 0, spending, burned > 0, burned, received) AS value,
            unconfirmed
          FROM txview
          FINAL
          WHERE txid IN (SELECT * FROM ${tempTable.name()})
        `, w((err, ret) => {
          if (err || !ret) {
            w.abort();
            savedError = dbError(err, "getTransactions1");
            return done();
          }
          const sum = {};
          for (const elem of ret) {
            const bt = sum[elem.txid] = sum[elem.txid] || { input: {}, output: {} };
            const type = bt[elem.type] = bt[elem.type];
            const bal = type[elem.address] = type[elem.address] || {
                value: BigInt(0), spentcount: 0, unconfirmed: BigInt(0) };
            bal.value += BigInt(elem.value);
            bal.unconfirmed += BigInt(elem.unconfirmed);
            bal.spentcount += Number(elem.spentcount);
          }
          const convert = (inout) => {
            const out = [];
            for (const addr of Object.keys(inout)) {
              const v = inout[addr];
              let value = (v.value === BigInt(0)) ? v.unconfirmed.toString() : v.value.toString();
              out.push({
                address: addr,
                value: value.toString(),
                spentcount: v.spentcount,
              });
            }
            out.sort((a,b) => (Number(b.value) - Number(a.value)));
            return out;
          };
          for (const tx of txs) {
            const bt = sum[tx.txid];
            tx.input = convert(bt.input);
            tx.output = convert(bt.output);
          }
        }));
      }).nThen((_) => {
        done();
      });
    }, w());
  }).nThen((_) => {
    if (savedError) {
      done(savedError);
    } else {
      txs.sort((a,b) => (+new Date(b.firstSeen)) - (+new Date(a.firstSeen)));
      done(null, txs);
    }
  });
};

const blockCoins1 = (sess, blockHash, limit, pgnum) => {
  if (!hashOk(sess, blockHash, 'blockCoins1')) { return; }
  const lim = limitFromPage(sess, limit, pgnum, `/block/${blockHash}/coins`, 50);
  if (!lim) { return; }
  getTransactions(sess, `txid IN (
    SELECT
        txid
      FROM tbl_blkTx
      WHERE blockHash = '${e(blockHash)}'
  )
  ORDER BY coinbase DESC, txid
  LIMIT ${lim.limit}
  `, (err, ret) => {
    if (!ret || !ret.length) {
      if (!err) { err = fourOhFour(sess, "no such block", "blockCoins1"); }
      return void complete(sess, err, null);
    }
    return void complete(sess, err, {
      results: ret,
      prev: lim.prev,
      next: lim.getNext(ret.length)
    });
  });
};

const txByTxid = (sess, txid) => {
  if (!hashOk(sess, txid, 'txByTxid')) { return; }
  getTransactions(sess, `txid = '${e(txid)}'`, (err, ret) => {
    if (!ret || !ret.length) {
      if (!err) { err = fourOhFour(sess, "no such txid", "txByTxid"); }
      return void complete(sess, err, null);
    }
    const tx = ret[0];
    return void complete(sess, err, tx);
  });
};

const dailyTransactions1 = (sess, limit, pgnum) => {
  const lim = limitFromPage(sess, limit, pgnum, `/stats/daily-transactions`, 30);
  if (!lim) { return; }
  sess.ch.query(`SELECT
      toDate(firstSeen)       AS date,
      count()                 AS transactionCount
    FROM tbl_tx
    GROUP BY toDate(firstSeen)
    ORDER BY toDate(firstSeen) DESC
    LIMIT ${lim.limit}
  `, (err, ret) => {
    if (err || !ret) {
      return void complete(sess, dbError(err, "dailyTransactions1"));
    }
    fixDates(ret, ['date']);
    for (const x of ret) {
      x.transactionCount = Number(x.transactionCount);
    }
    return void complete(sess, null, {
      results: ret,
      prev: lim.prev,
      next: lim.getNext(ret.length)
    });
  });
};

const dailyTransactions0 = (sess) => {
  sess.ch.query(`SELECT
      toDate(firstSeen)       AS date,
      count()                 AS transactionCount
    FROM tbl_tx
    GROUP BY toDate(firstSeen)
    ORDER BY toDate(firstSeen) DESC
    LIMIT 1,30
  `, (err, ret) => {
    if (err || !ret) {
      return void complete(sess, dbError(err, "dailyTransactions0"));
    }
    fixDates(ret, ['date']);
    for (const x of ret) {
      x.transactionCount = Number(x.transactionCount);
    }
    return void complete(sess, null, {
      results: ret.reverse()
    });
  });
};

const dedupCoins = (coins) => {
  const txDate = {};
  for (const c of coins) {
    const key = c.mintTxid + '|' + String(c.mintIndex);
    const n = txDate[key];
    const time = Number(c.dateMs);
    if (!n || n < time) {
      txDate[key] = time;
    }
  }
  return coins.filter((c) => (
    txDate[c.mintTxid + '|' + String(c.mintIndex)] === Number(c.dateMs)
  ));
};

const addressCoins1 = (sess, address, limit, pgnum, mining) => {
  const lim = limitFromPage(sess, limit, pgnum, `/address/${address}/coins`, 50);
  if (!lim) { return; }
  let mc = 'AND coinbase = 0';
  if (mining === 'only') {
    mc = 'AND coinbase > 0';
  } else if (mining === 'included') {
    mc = '';
  }
  getTransactions(sess, `txid IN (
    SELECT
        txid
      FROM (
        SELECT
            argMax(mintTime, dateMs)    AS time,
            mintTxid                    AS txid
          FROM coins
          WHERE
            address = '${e(address)}'
            ${mc}
          GROUP BY mintTxid
        UNION ALL SELECT
            argMax(spentTime, dateMs)   AS time,
            spentTxid                   AS txid
          FROM coins
          WHERE
            spentTime > 0
            AND address = '${e(address)}'
          GROUP BY spentTxid, spentTime
      )
      ORDER BY time DESC
      LIMIT ${lim.limit}
  )`, (err, ret) => {
    if (!ret) {
      return void complete(sess, err);
    }
    // We can't rely on the length of the output really at all because
    // we're doing an UNION ALL so we'll just assume there are more pages
    // any time it is non-zero.
    const next = lim.getNext(ret.length > 0);
    return void complete(sess, null, {
      results: ret,
      prev: lim.prev + ((lim.prev && mining) ? `?mining=${mining}` : ''),
      next: next + ((next && mining) ? `?mining=${mining}` : '')
    });
  });
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const isDate = (d) => {
  if (!DATE_REGEX.test(d)) { return false; }
  return !isNaN(new Date(d));
}

const addressIncome1 = (sess, address, limit, pgnum, mining, csv) => {
  const r = getCoinInfo(sess);
  if (!r) { return; }
  
  let mc = 'AND coinbase > 0';
  if (mining === 'excluded') {
    mc = 'AND coinbase = 0';
  } else if (mining === 'included') {
    mc = '';
  } else {
    mining = 'only'
  }

  let lim;
  let maxDate;
  let minDate;
  if (isDate(limit) && isDate(pgnum)) {
    minDate = new Date(limit);
    maxDate = new Date(pgnum);
    if ((+maxDate) - (+minDate) > 2*365*MS_PER_DAY) {
      return void complete(sess, {
        code: 400,
        error: "maximum date range is 2 years",
        fn: "addressIncome1"
      });
    }
  } else {
    lim = limitFromPage(sess, limit, pgnum, `/address/${address}/income`, 2*365);
    if (!lim) { return; }
    // Exclude today because it will necessarily be incomplete
    maxDate = new Date(+new Date() - MS_PER_DAY -
      (lim.maxLimit * (lim.pageNumber - 1) * MS_PER_DAY));
    minDate = new Date(+maxDate - (lim.maxLimit * MS_PER_DAY));
  }

  // If there are any days missing, we need to fill them in with zeros.
  // The database doesn't know what it doesn't know, but when we're asking for
  // income, nothing means zero.
  const out = [];
  for (let d = +maxDate; d >= +minDate; d -= MS_PER_DAY) {
    out.push({
      date: (new Date(d)).toISOString().replace(/T.*$/, 'T00:00:00.000Z'),
      received: "0",
    });
  }

  const minDateS = minDate.toISOString().replace(/T.*$/, '');
  const maxDateS = maxDate.toISOString().replace(/T.*$/, '');

  sess.ch.query(`SELECT
      date,
      sum(received) AS received
    FROM addrincome
    WHERE
      address = '${e(address)}' AND
      date >= toDate('${minDateS}') AND
      date <= toDate('${maxDateS}')
      ${mc}
    GROUP BY address, date
    ORDER BY date DESC
  `, (err, ret) => {
    if (err || !ret) {
      return void complete(sess, dbError(err, "addressIncome1"));
    }
    fixDates(ret, ['date']);
    const resultTbl = {};
    for (const el of ret) { resultTbl[el.date] = el.received; }
    for (const el of out) { el.received = resultTbl[el.date] || "0"; }
    if (csv) {
      sess.res.setHeader('Content-Type', 'text/csv');
      sess.res.setHeader('Content-Disposition', 'attachment; filename="' +
        `income_${e(address)}_${minDateS}_to_${maxDateS}_mining_${mining}.csv"`);
      const stringifier = MkCsvStringifier({
        header: [
          { id: 'date', title: 'date' },
          { id: 'received', title: 'received' },
          { id: 'receivedCoins', title: 'receivedCoins' },
        ]
      });
      const outCsv = [];
      for (const el of out) {
        outCsv.push({
          date: el.date,
          received: el.received,
          receivedCoins: Number(el.received) / r.unitsPerCoin
        })
      }
      complete(sess, null, stringifier.getHeaderString()+stringifier.stringifyRecords(outCsv));
    } else {
      const res = {};
      res.results = out;
      if (lim) {
        const next = lim.getNext(true);
        res.prev = lim.prev + ((lim.prev && mining !== 'only') ? `?mining=${mining}` : '');
        res.next = next + ((next && mining !== 'only') ? `?mining=${mining}` : '')
      }
      complete(sess, null, res);
    }
  });
};

const nsCandidates = (sess, limit, pgnum) => {
  const lim = limitFromPage(sess, limit, pgnum, `/ns/candidates`, 100);
  if (!lim) { return; }
  sess.ch.query(`SELECT
      candidate,
      sumIf(votes, type = 'for') AS votesFor,
      sumIf(votes, type = 'against') AS votesAgainst
    FROM votes
    WHERE candidate != ''
    GROUP BY candidate
    ORDER BY votesFor DESC
  `, (err, ret) => {
    if (err || !ret) {
      return void complete(sess, dbError(err, "nsCandidates"));
    }
    complete(sess, null, {
      results: ret,
      prev: lim.prev,
      next: lim.getNext(ret.length),
    });
  });
};

const getCoinInfo = (sess) => {
  let r = Rewards.pkt;
  if (sess.config.blockRewards) {
    r = Rewards[sess.config.blockRewards];
    if (typeof(r) !== 'function') {
      return void complete(sess, {
        code: 500,
        error: "blockReward model [" + sess.config.blockRewards + "] does not exist",
        fn: "onReq"
      });
    }
  }
  return r;
}

const ns = (sess) => {
  const r = getCoinInfo(sess);
  if (!r) { return; }
  sess.ch.query(`WITH (
      SELECT
          networkSteward,
          height
        FROM tbl_blk
        ORDER BY height DESC, dateMs DESC
        LIMIT 1
    ) AS ns_height
    SELECT
      candidate,
      sumIf(votes, type = 'for') AS votesFor,
      sumIf(votes, type = 'against') AS votesAgainst,
      ns_height.2 AS height
    FROM votes
    WHERE candidate = ns_height.1
    GROUP BY candidate
    FORMAT JSONEachRow
  `, (err, ret) => {
    if (err || !ret || !ret.length) {
      return void complete(sess, dbError(err, "ns"));
    }
    complete(sess, null, {
      networkSteward: ret[0].candidate,
      votesAgainst: ret[0].votesAgainst,
      votesNeeded: (BigInt(r(ret[0].height).alreadyMined) / BigInt(2)).toString()
    });
  });
};

const addressCoins = (sess, address, limit, pgnum) => {
  const lim = limitFromPage(sess, limit, pgnum, `/address/${address}/coins`, 10);
  if (!lim) { return; }
  const ch = sess.ch.withSession();
  const tempCoins = `temp_coins_${ch.sessionId()}`;

  const coinTx = {};

  let count = 0;
  let coins = [];
  let fundingTxOutputs = [];
  let fundingTxInputs = [];
  let spendingTxOutputs = [];
  let spendingTxInputs = [];
  //
  // count: length of `coins`
  // coins: txouts paying to our address
  //
  // fundingTxInputs:   spentTxid = coins.mintTxid    //  a0,a1,a2
  // fundingTxOutputs:  mintTxid  = coins.mintTxid    //  b0,b1,txout
  // spendingTxInputs:  spentTxid = coins.spentTxid   //  c0,c1,txin
  // spendingTxOutputs: mintTxid  = coins.spentTxid   //  d0,d1,d2
  //
  //               -[a0]-> +-+-+-+-+-+  -[b0]->         -[c0]-> +-+-+-+-+-+-+  -[d0]->
  //                       |         |                          |           |
  //               -[a1]-> + mint tx +  -[txout]-------[txin]-> +  spend tx +  -[d1]->
  //                       |         |                          |           |
  //               -[a2]-> +-+-+-+-+-+  -[b1]->         -[c1]-> +-+-+-+-+-+-+  -[d2]->
  //
  // fundingTxInputs --> [ tx: fundingTxOutputs + coins ] ->
  //
  //   let [fundingTxInputs, fundingTxOutputs, spendingTxInputs, spendingTxOutputs] = await Promise.all([
  //     coin_1.CoinStorage.collection.find({ chain, network, spentTxid: { $in: mintedTxids } }).toArray(),
  //     coin_1.CoinStorage.collection.find({ chain, network, mintTxid: { $in: mintedTxids } }).toArray(),
  //     coin_1.CoinStorage.collection.find({ chain, network, spentTxid: { $in: spentTxids } }).toArray(),
  //     coin_1.CoinStorage.collection.find({ chain, network, mintTxid: { $in: spentTxids } }).toArray()
  // ]);
  // pkt1quuy5e0cztzqa2uur87ml5ys5mrhu3gh7ay3mct
  //
  nThen((w) => {
    // tx count
    ch.query(`SELECT
        count() as numberOfTransactions
      FROM (
        SELECT
          1 as x
        FROM coins
        WHERE
          address = '${e(address)}'
        GROUP BY (mintTxid,mintIndex)
      )
    `, w((err, ret) => {
      if (!err && ret) {
        try {
          count = Number(ret[0].numberOfTransactions);
          if (!isNaN(count)) { return; }
        } catch (e) { }
        err = new Error('unexpected result ' + String(ret));
      }
      w.abort();
      complete(sess, dbError(err, 'addressCoins/numberOfTransactions'));
    }));
  }).nThen((w) => {
    // coins
    // When creating a temporary table, one must specify the db
    ch.modify(`CREATE TEMPORARY TABLE ${tempCoins} AS SELECT
        mintTxid,
        mintIndex,
        argMax(spentTxid, dateMs)  AS spentTxid,
        argMax(mintTime, dateMs)   AS mintTime,
        argMax(spentTime, dateMs)  AS spentTime
      FROM ${ch.opts.db}.coins
      WHERE
        address = '${e(address)}'
      GROUP BY (mintTxid,mintIndex)
      ORDER BY if(spentTime > mintTime, spentTime, mintTime) DESC
      LIMIT ${lim.limit}
    `, w((err, _) => {
      if (err) {
        w.abort();
        return void complete(sess, dbError(err, "addressCoins/tempTable"));
      }
    }));
  }).nThen((w) => {
    ch.query(`SELECT mintTxid, mintIndex FROM ${tempCoins}
    `, w((err, ret) => {
      if (err || !ret) {
        w.abort();
        return void complete(sess, dbError(err, 'addressCoins/coins'));
      }
      for (const c of ret) {
        coinTx[c.mintTxid + '|' + c.mintIndex] = true;
      }
    }));
  }).nThen((w) => {
    ch.query(`
      SELECT
          *,
          toString(mintBlockHash)  AS mintBlockHash,
          toString(spentTxid)      AS spentTxid,
          toString(spentBlockHash) AS spentBlockHash,
          prevState,
          currentState
        FROM coins
        WHERE
          mintTxid IN (SELECT mintTxid FROM ${tempCoins}) OR
          mintTxid IN (SELECT spentTxid FROM ${tempCoins}) OR
          (
            coins.spentTxid != toFixedString('',64) AND (
              coins.spentTxid IN (SELECT mintTxid FROM ${tempCoins}) OR
              coins.spentTxid IN (SELECT spentTxid FROM ${tempCoins})
            )
          )
        ORDER BY value DESC
    `, w((err, ret) => {
      if (err || !ret) {
        w.abort();
        return void complete(sess, dbError(err, "addressCoins/select"));
      }
      // Remove duplicate entries from the return because we didn't do it in SQL
      const data = dedupCoins(ret);
      fixDates(data, ['seenTime','mintTime','spentTime']);
      const coinMint = {};
      const coinSpent = {};
      let maxMint = 0;
      for (const c of data) {
        if (!coinTx[c.mintTxid + '|' + c.mintIndex]) { continue; }
        delete c['coins.spentTxid'];
        delete c['coins.spentBlockHash'];
        delete c['coins.mintBlockHash'];
        coins.unshift(c);
        if (maxMint < c.mintTime) { maxMint = c.mintTime; }
        coinMint[c.mintTxid] = true;
        coinSpent[c.spentTxid] = true;
      }
      //console.log(`maxMint = ${maxMint}`);
      for (const c of data) {
        // fundingTxInputs:   spentTxid = coins.mintTxid    //  a0,a1,a2
        // fundingTxOutputs:  mintTxid  = coins.mintTxid    //  b0,b1,txout
        // spendingTxInputs:  spentTxid = coins.spentTxid   //  c0,c1,txin
        // spendingTxOutputs: mintTxid  = coins.spentTxid   //  d0,d1,d2
        if (coinMint[c.mintTxid]) {
          // mint == coins.mint
          fundingTxOutputs.push(c);
        }
        if (coinSpent[c.mintTxid]) {
          // mint == coins.spent
          spendingTxOutputs.push(c);
        }
        if (coinMint[c.spentTxid]) {
          // spent == coins.mint
          fundingTxInputs.push(c);
        }
        if (coinSpent[c.spentTxid]) {
          // spent == coins.spent
          spendingTxInputs.push(c);
        }
      }
    }));
  }).nThen((w) => {
    ch.modify(`DROP TABLE ${tempCoins}`, w((err, _) => {
      if (err) {
          w.abort();
          return void complete(sess, dbError(err, "addressCoins/drop"));
      }
    }));
  }).nThen((w) => {
    let spentTxids = coins.filter(tx => tx.spentTxid).map(tx => tx.spentTxid);
    let mintedTxids = coins.filter(tx => tx.mintTxid).map(tx => tx.mintTxid);
    [
      coins,
      fundingTxOutputs,
      fundingTxInputs,
      spendingTxOutputs,
      spendingTxInputs
    ].forEach((x) => {
      x.forEach((y) => {
        y.value = Number(y.value);
      });
    });
    complete(sess, null, {
      count,
      coins,
      mintedTxids,
      spentTxids,
      fundingTxOutputs,
      fundingTxInputs,
      spendingTxOutputs,
      spendingTxInputs,
      prev: lim.prev,
      next: lim.getNext(coins.length)
    });
  });
};

const enabledChains = (sess) => {
  const out = [];
  const path = sess.ctx.path;
  Object.keys(path).map((k) => {
    Object.keys(path[k]).forEach((kk) => {
      out.push({ chain: k, network: kk });
    });
  });
  complete(sess, null, out);
};

const isHash = (input) => /^[0-9a-fA-F]{64}$/.test(input);
const isValid = (sess, input) => {
  const result = { isValid: true, type: 'invalid' };
  if (isHash(input) || isCannonicalPositiveIntOrZero(input)) {
    result.type = 'blockOrTx';
  } else if (isValidAddress(sess.config, input)) {
    result.type = 'addr';
  } else {
    result.isValid = false;
  }
  return void complete(sess, null, result);
};

const statsCoins = (sess, num) => {
  nThen((w) => {
    if (typeof(num) !== 'undefined') { return; }
    sess.ch.query(`SELECT
        height
      FROM chain
      FINAL
      ORDER BY height DESC
      LIMIT 1
    `, w((err, ret) => {
      if (err || !ret || !ret.length) {
        w.abort();
        return void complete(sess, dbError(err, "statsCoins"));
      }
      num = ret[0].height;
    }));
  }).nThen((w) => {
    if (!isCannonicalPositiveIntOrZero(num)) {
      return void complete(sess, fourOhFour(sess, "expecting a block number", 'statsCoins'));
    }
    let r = Rewards.pkt;
    if (sess.config.blockRewards) {
      r = Rewards[sess.config.blockRewards];
      if (typeof(r) !== 'function') {
        return void complete(sess, {
          code: 500,
          error: "blockReward model [" + sess.config.blockRewards + "] does not exist",
          fn: "onReq"
        });
      }
    }
    return void complete(sess, null, r(Number(num)));
  });
};

const onReq = (ctx, req, res) => {
  ctx.log.debug(req.method + ' ' + req.url);
  const sess = {
    ctx: ctx,
    startTime: +new Date(),
    req: req,
    res: res,
    ch: ctx.ch,
    config: undefined,
  };
  let parts = req.url.replace(/\?.*$/, '').split('/');
  let path = ctx.path;
  parts.shift();// leading ''
  if (parts.shift() !== 'api') {
    return void complete(sess, fourOhFour(sess, "path does not begin with /api", "onReq"));
  }
  let apiver = 0;
  if (parts[0] === 'v1') {
    apiver = 1;
    parts.shift();
  }
  if (parts[0] === 'status' && parts[1] === 'enabled-chains') {
    return void enabledChains(sess);
  }
  while (parts.length) {
    if (!path) {
      return void complete(sess, fourOhFour(sess, "invalid path", "onReq"));
    }
    if (typeof(path) !== 'object') {
      return void complete(sess, { code: 500, error: "decoding path", fn: "onReq" });
    }
    if (typeof(path.clickhouseDb) === 'string') {
      sess.config = path;
      sess.ch = ctx.ch.withDb(path.clickhouseDb);
      break;
    }
    path = path[parts.shift()];
  }
  Object.freeze(sess);
  const query = Querystring.parse(req.url.replace(/^[^\?]+\?/, ''));
  //console.log(parts);

  if (!sess.config) {
    return void complete(sess, fourOhFour(sess, "unsupported chain", "onReq"));
  }

  if (apiver === 1) {
    switch (parts[0]) {
      // /api/PKT/pkt/stats/
      case 'stats': switch (parts[1]) {
        // /api/PKT/pkt/stats/richlist
        case 'richlist': return void richList(sess, parts[2], parts[3]);
        case 'daily-transactions': return void dailyTransactions1(sess, parts[2], parts[3]);
      } break;

      case 'ns': switch(parts[1]) {
        case 'candidates': return void nsCandidates(sess, parts[2], parts[3]);
        case undefined: return void ns(sess);
      }

      // /api/PKT/pkt/address/
      case 'address': switch (parts[1]) {
        // /api/PKT/pkt/address/:addr/
        default: const addr = parts[1]; switch (parts[2]) {
          // /api/PKT/pkt/address/:addr/
          case undefined: return void address1(sess, addr);
          // /api/PKT/pkt/address/:addr/coins
          case 'coins': return void addressCoins1(sess, addr, parts[3], parts[4], query.mining);
          case 'income': return void addressIncome1(
            sess, addr, parts[3], parts[4], query.mining, query.csv);
        }
      } break;

      case 'block': {
        const blockHash = parts[1];
        switch (parts[2]) {
          case 'coins': return void blockCoins1(sess, blockHash, parts[3], parts[4]);
          case undefined: {
            if (!hashOk(sess, blockHash, "onReq/queryBlock")) { return; }
            return void queryBlock01(sess, `hash = '${e(blockHash)}'`);
          }
        }
      } break;

      case 'chain': switch (parts[1]) {
        case 'up': return void chain(sess, true, parts[2], parts[3]);
        case 'down': return void chain(sess, false, parts[2], parts[3]);
      } break;

      // /api/PKT/pkt/tx/
      case 'tx': {
        // /api/PKT/pkt/tx/:txid/
        const txid = parts[1];
        switch (parts[2]) {
          case 'detail': return void txDetail1(sess, txid, parts[3], parts[4]);
          case undefined: return void txByTxid(sess, txid);
        }
      } break;

      case 'packetcrypt': {
        switch (parts[1]) {
          // /api/PKT/pkt/packetcrypt/stats/1/1
          case 'stats': return void packetcryptStats(sess, parts[2], parts[3]);
          // /api/PKT/pkt/packetcrypt/:blockHash
          default: return void packetcryptBlock(sess, parts[1]);
        }
      }
    }
  }

  switch (parts[0]) {

    // /api/PKT/pkt/valid/:address_number_or_hash
    case 'valid': return void isValid(sess, parts[1]);

    // /api/PKT/pkt/stats/
    case 'stats': switch (parts[1]) {
      // /api/PKT/pkt/stats/richlist
      case 'richlist': return void richList(sess, parts[2], parts[3]);
      case 'daily-transactions': return void dailyTransactions0(sess);

      // /api/PKT/pkt/stats/coins/:blocknum
      case 'coins': return statsCoins(sess, parts[2]);
    } break;

    // /api/PKT/pkt/address/
    case 'address': switch (parts[1]) {
      // /api/PKT/pkt/address/:addr/
      default: const addr = parts[1]; switch (parts[2]) {
        // /api/PKT/pkt/address/:addr/
        case undefined: return void complete(sess, null, []);
        // /api/PKT/pkt/address/:addr/balance
        case 'balance': return void addressBalance(sess, addr);
        // /api/PKT/pkt/address/:addr/coins
        case 'coins': return void addressCoins(sess, addr, parts[3], parts[4]);
      }
    } break;

    // /api/PKT/pkt/block/
    case 'block': switch (parts[1]) {
      // /api/PKT/pkt/block/?limit=15
      case undefined: return void queryBlocks(sess, query, (x)=>x);
      // /api/PKT/pkt/block/tip
      case 'tip': return void queryBlocks(sess, { limit: 1 }, (x)=>x[0]);
      // /api/PKT/pkt/block/:hash
      default: const blockHashOrNum = parts[1]; switch (parts[2]) {
        // /api/PKT/pkt/block/:hashOrNumber/
        case undefined: if (isHash(blockHashOrNum)) {
          return void queryBlock01(sess, `hash = '${e(blockHashOrNum)}'`);
        } else if (isCannonicalPositiveIntOrZero(blockHashOrNum)) {
          return void queryBlockByNumber0(sess, blockHashOrNum);
        } break;
        // /api/PKT/pkt/block/:hash/coins/[:limit/:page]
        case 'coins': return void blockCoins0(sess, blockHashOrNum, parts[3], parts[4]);
      }
    } break;

    // /api/PKT/pkt/tx/
    case 'tx': switch (parts[1]) {
      // /api/PKT/pkt/tx/?blockHash=...
      case undefined: if (query.blockHash) {
        return void txByBlockHash(sess, query.blockHash);
      } break;
      // /api/PKT/pkt/tx/:txid/
      default: const txid = parts[1]; switch (parts[2]) {
        case 'coins': return void txCoins0(sess, txid, parts[3], parts[4]);
        case undefined: return void txByTxid(sess, txid);
      }
    } break;
  }
  return void complete(sess, fourOhFour(sess, "no such endpoint", "onReq"));
};

const usage = () => {
  console.error("Usage: node ./server.js --port 8083   # Launch http server on port 8083");
};

const main = (config, argv) => {
  const path = {};
  Object.keys(config.enabledChains).forEach((k) => {
    const ka = k.split('/');
    (path[ka[0]] = path[ka[0]] || {})[ka[1]] = config.enabledChains[k];
  });
  const conf = JSON.parse(JSON.stringify(config.clickhouse));
  //conf.readonly = true;
  const ctx = (Object.freeze({
    ch: ClickHouse.create(conf),
    path: Object.freeze(path),
    log: Log.create('srv'),
  }) /*:Context_t*/);

  const pi = argv.indexOf('--port');
  const port = pi > -1 ? Number(argv[pi + 1]) : -1;
  if (port <= 0) { return void usage(); }
  Http.createServer((req, res) => {
    onReq(ctx, req, res);
  }).listen(port);
  console.error("Listening on " + port);
};
main(Config, process.argv);

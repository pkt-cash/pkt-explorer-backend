/*@flow*/
/* global BigInt */
// SPDX-License-Identifier: MIT
'use strict';
const Http = require('http');
const Querystring = require('querystring');

const nThen = require('nthen');
const Bs58Check = require('bs58check');
const Bech32 = require('bech32');

const ClickHouse = require('./lib/clickhouse.js');
const Log = require('./lib/log.js');

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
  sess.res.setHeader('Content-Type', 'application/json');
  if (error) {
    sess.res.statusCode = error.code;
    sess.res.end(JSON.stringify(error, null, '\t'));
  } else {
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
          *
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

const limitFromPage = (limit, pgnum, path, max) => {
  const pageNumber = parseInt(pgnum, 10) || 1;
  const maxLimit = Math.min(max, parseInt(limit, 10) || max);
  let prev = "";
  if (pageNumber > 1) {
    prev = `${path}/${maxLimit}/${pageNumber - 1}`;
  }
  return {
    limit: `${maxLimit * (pageNumber - 1)}, ${maxLimit}`,
    prev: prev,
    getNext: (rowsLength) => {
      if (rowsLength < maxLimit) { return ""; }
      return `${path}/${maxLimit}/${pageNumber + 1}`;
    }
  };
};

const e = (str) => String(str).replace(/'/g, '_');

const txCoins = (sess, txid, limit, pgnum) => {
  if (!hashOk(sess, txid, 'txCoins')) { return; }
  const lim = limitFromPage(limit, pgnum, `/tx/${txid}/coins`, 500);
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

const blockCoins = (sess, blockHash, limit, pgnum) => {
  if (!hashOk(sess, blockHash, 'blockCoins')) { return; }
  const lim = limitFromPage(limit, pgnum, `/block/${blockHash}/coins`, 500);
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

const queryBlocks0 = (sess, fn, whereClause, then) => {
  sess.ch.query(`SELECT
      *
    FROM tbl_blk
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
  queryBlocks0(sess, 'queryBlocks', `hash IN (
    SELECT
        argMax(hash,dateMs) AS hash
      FROM (
          SELECT
            *
          FROM int_mainChain
          ${(!isNaN(since)) ? `WHERE height < ${e(since)}` : ''}
          ORDER BY height DESC
          LIMIT ${limit}
      )
      GROUP BY height
  )`, (ret) => {
    complete(sess, null, filter(ret));
  });
};

const queryBlock = (sess, whereClause) => {
  queryBlocks0(sess, 'queryBlock', whereClause, (ret) => {
    complete(sess, null, ret[0]);
  });
};

const queryBlockByNumber = (sess, number) => {
  queryBlocks0(sess, 'queryBlock', `hash IN (
    SELECT
        hash
      FROM int_mainChain
      WHERE height = ${Number(number)}
      ORDER BY dateMs DESC
      LIMIT 1
  )`, (ret) => {
    complete(sess, null, ret[0]);
  });
};

const chain = (sess, up, limit, pgnum) => {
  const lim = limitFromPage(limit, pgnum, `/chain/${(up) ? 'up' : 'down'}`, 100);
  queryBlocks0(sess, 'chain', `hash IN (
    SELECT
        hash
      FROM int_mainChain
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
  const lim = limitFromPage(limit, pgnum, '/packetcrypt/stats', 50);
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

const hashOk = (sess, hash, fn) => {
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    complete(sess, fourOhFour(sess, "expecting a hash (32 lower case hex bytes)", fn));
    return false;
  }
  return true;
};

const packetcryptBlock = (sess, hash) => {
  if (!hashOk(sess, hash, "packetcryptBlock")) { return; }
  let block;
  nThen((w) => {
    queryBlocks0(sess, 'packetcryptBlock', `hash = '${e(hash)}'`, w((ret) => {
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
          floor(pcAnnCount * pcAnnDifficulty / maxDiff) * 1024 * 8  AS blockBits,
          floor(pcAnnCount * pcAnnDifficulty + pcBlkDifficulty) * 5 AS blockEncryptions
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
  })

};

const richList = (sess, limit, pgnum) => {
  const lim = limitFromPage(limit, pgnum, `/stats/richlist`, 500);
  sess.ch.query(`SELECT
      address,
      sum(balance)     AS balance,
      sum(unconfirmed) AS unconfirmed,
      sum(received)    AS received,
      sum(spent)       AS spent
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

// https://github.com/bitpay/bitcore/blob/v8.2.0/packages/bitcore-node/src/models/coin.ts#L65
const addressBalance = (sess, address) => {
  sess.ch.query(`SELECT
      sumIf(value, bitShiftRight(state, 3) == 1)  AS unconfirmedReceived,
      sumIf(value, bitShiftRight(state, 3) > 1)   AS confirmedReceived,
      confirmedReceived - spent - burned          AS balance,
      sumIf(value, bitShiftRight(state, 3) == 3)  AS spent,
      sumIf(value, bitShiftRight(state, 3) == 4)  AS burned,
      count()                                     AS recvCount,
      countIf(bitShiftRight(state, 3) == 3)       AS spentCount,
      sumIf(value, and(mintTime > subtractHours(now(), 24), coinbase > 0))  AS mined24

    FROM (
      SELECT
          any(value)               AS value,
          argMax(state,    dateMs) AS state,
          any(coinbase)            AS coinbase,
          argMax(mintTime, dateMs) AS mintTime
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

const getTransactions = (sess, whereClause, done) => {
  let txs /*:Array<Tables.tbl_tx_t & {
    blockHash?: string,
    blockTime?: string,
    blockHeight?: number,
    input: Array<{ address: string, value: string, spentcount: number, unconfirmed: string }>,
    output: Array<{ address: string, value: string, spentcount: number, unconfirmed: string }>,
  }>*/;
  const byTxid = {};
  let savedError;
  nThen((w) => {
    sess.ch.query(`SELECT
        *
      FROM tbl_tx
      WHERE ${whereClause}
    `, w((err, ret) => {
      if (err || !ret) {
        return void done(dbError(err, "queryTx"));
      } else {
        fixDates(ret, ['firstSeen']);
        txs = ret;
        for (const tx of txs) { byTxid[tx.txid] = tx; }
      }
    }));
  }).nThen((w) => {
    if (txs.length === 0) { return; }
    const txids = txs.map((x) => ({ txid: x.txid }));
    const ch = sess.ch.withSession();
    // In this case, repeating ourselves with a WHERE shaves 100ms off the query
    ch.withTempTable(Table_txids, txids, (ch, tempTable, done) => {
      let failed = false;
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
            if (failed) { return; }
            failed = true;
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
            multiIf(spent > 0, spent, burned > 0, burned, received) AS value,
            unconfirmed
          FROM txview
          FINAL
          WHERE txid IN (SELECT * FROM ${tempTable.name()})
        `, w((err, ret) => {
          if (err || !ret) {
            if (failed) { return; }
            failed = true;
            w.abort();
            savedError = dbError(err, "getTransactions1");
            return done();
          }
          const sum = {};
          for (const elem of ret) {
            const bt = sum[elem.txid] = sum[elem.txid] || { input: {}, output: {} };
            const type = bt[elem.type] = bt[elem.type]
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
              out.push({
                address: addr,
                value: v.value.toString(),
                unconfirmed: v.unconfirmed.toString(),
                spentcount: v.spentcount,
              });
            }
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
      done(savedError)
    } else {
      done(null, txs);
    }
  })
};

const blockCoins1 = (sess, blockHash, limit, pgnum) => {
  if (!hashOk(sess, blockHash, 'blockCoins1')) { return; }
  const lim = limitFromPage(limit, pgnum, `/block/${blockHash}/coins`, 50);
  getTransactions(sess, `txid IN (
    SELECT
        txid
      FROM tbl_blkTx
      WHERE blockHash = '${e(blockHash)}'
  )
  ORDER BY coinbase DESC, txid
  LIMIT ${lim.limit}
  `, (err, ret) => {
    if (!ret) {
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
    if (!ret) {
      if (!err) { err = fourOhFour(sess, "no such txid", "txByTxid"); }
      return void complete(sess, err, null);
    }
    const tx = ret[0];
    return void complete(sess, err, tx);
  });
};

const dailyTransactions = (sess) => {
  sess.ch.query(`SELECT
      toDate(firstSeen)       AS date,
      count()                 AS transactionCount
    FROM tbl_tx
    GROUP BY toDate(firstSeen)
    ORDER BY toDate(firstSeen) DESC
    LIMIT 1,30
  `, (err, ret) => {
    if (err || !ret) {
      return void complete(sess, dbError(err, "dailyTransactions"));
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

const addressCoins1 = (sess, address, limit, pgnum, nomine) => {
  const lim = limitFromPage(limit, pgnum, `/address/${address}/coins`, 50);
  getTransactions(sess, `txid IN (
    SELECT
        if(_spentTime > _mintTime, _spentTxid, mintTxid) AS txid
      FROM (
        SELECT
            argMax(spentTxid, dateMs)  AS _spentTxid,
            argMax(mintTime, dateMs)   AS _mintTime,
            argMax(spentTime, dateMs)  AS _spentTime,
            mintTxid
          FROM coins
          WHERE
            address = '${e(address)}'
            ${(nomine) ? `AND coinbase = 0` : ''}
          GROUP BY mintTxid, mintIndex
          ORDER BY if(_spentTime > _mintTime, _spentTime, _mintTime) DESC
          LIMIT ${lim.limit}
      )
  )`, (err, ret) => {
    if (!ret) {
      return void complete(sess, err);
    }
    const next = lim.getNext(ret.length);
    return void complete(sess, null, {
      results: ret,
      prev: lim.prev + ((lim.prev && nomine) ? '?nomine=1' : ''),
      next: next + ((next && nomine) ? '?nomine=1' : '')
    });
  });
};

const addressIncome1 = (sess, address, limit, pgnum) => {
  const lim = limitFromPage(limit, pgnum, `/address/${address}/income`, 100);
  sess.ch.query(`SELECT
      date,
      sum(received) AS received
    FROM addrincome
    WHERE address = '${e(address)}'
    GROUP BY address, date
    ORDER BY date DESC
    LIMIT ${lim.limit}
  `, (err, ret) => {
    if (err || !ret) {
      return void complete(sess, dbError(err, "queryTx"));
    }
    fixDates(ret, ['date']);
    complete(sess, null, {
      result: ret,
      prev: lim.prev,
      next: lim.getNext(ret.length)
    });
  });
};

const addressCoins = (sess, address, limit, pgnum) => {
  const lim = limitFromPage(limit, pgnum, `/address/${address}/coins`, 10);
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
          toString(spentBlockHash) AS spentBlockHash
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
const isCannonicalPositiveIntOrZero = (num) => {
  const n = Number(num);
  if (!isFinite(n)) { return false; }
  if (n < 0) { return false; }
  if (Math.floor(n) !== n) { return false; }
  if (String(n) !== String(num)) { return false; }
  return true;
};
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
        case 'daily-transactions': return void dailyTransactions(sess);
      } break;

      // /api/PKT/pkt/address/
      case 'address': switch (parts[1]) {
        // /api/PKT/pkt/address/:addr/
        default: const addr = parts[1]; switch (parts[2]) {
          // /api/PKT/pkt/address/:addr/
          case undefined: return void address1(sess, addr);
          // /api/PKT/pkt/address/:addr/coins
          case 'coins': return void addressCoins1(sess, addr, parts[3], parts[4], query.nomine);
          case 'income': return void addressIncome1(sess, addr, parts[3], parts[4]);
        }
      } break;

      case 'block': {
        const blockHash = parts[1];
        switch (parts[2]) {
          case 'coins': return void blockCoins1(sess, blockHash, parts[3], parts[4]);
          case undefined: {
            if (!hashOk(sess, blockHash, "onReq/queryBlock")) { return; }
            return void queryBlock(sess, `hash = '${e(blockHash)}'`);
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
          case 'detail': return void txCoins(sess, txid, parts[3], parts[4]);
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
      case 'daily-transactions': return void dailyTransactions(sess);
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
          return void queryBlock(sess, `hash = '${e(blockHashOrNum)}'`);
        } else if (isCannonicalPositiveIntOrZero(blockHashOrNum)) {
          return void queryBlockByNumber(sess, blockHashOrNum);
        } break;
        // /api/PKT/pkt/block/:hash/coins/[:limit/:page]
        case 'coins': return void blockCoins(sess, blockHashOrNum, parts[3], parts[4]);
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
        case 'coins': return void txCoins(sess, txid, parts[3], parts[4]);
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

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
*/

const complete = (sess /*:Session_t*/, error /*:Error_t|null*/, data) => {
  const timeSpan = ((+new Date()) - sess.startTime) / 1000;
  sess.res.setHeader('Content-Type', 'application/json');
  if (error) {
    sess.res.statusCode = error.code;
    sess.res.end(JSON.stringify(error, null, '\t'));
  } else {
    sess.res.end(JSON.stringify(data, null, '\t'));
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
    WHERE ${whereClause}`, (err, ret) => {
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
      countIf(bitShiftRight(state, 3) == 3)       AS spentCount
    FROM (
      SELECT
          argMax(value,       dateMs) AS value,
          argMax(state,       dateMs) AS state
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
  queryTx(sess, `txid IN (
    SELECT
      txid
    FROM tbl_blkTx
    WHERE blockHash = '${e(blockHash)}'
  )`, (x) => {
    return void complete(sess, null, x);
  });
};

const txByTxid = (sess, txid) => {
  let tx /*:Tables.tbl_tx_t & {
    blockHash?: string,
    blockTime?: string,
    blockHeight?: number
  }*/;
  nThen((w) => {
    queryTx(sess, `txid = '${e(txid)}'`, w((x) => {
      if (x.length < 1) {
        w.abort();
        return void complete(sess, fourOhFour(sess, "no such tx", "txByTxid"));
      }
      tx = x[0];
    }));
  }).nThen((w) => {
    sess.ch.query(`
      SELECT
          *
        FROM tbl_blk
        WHERE hash IN (
          SELECT
              blockHash
            FROM tbl_blkTx
            WHERE txid = '${e(txid)}'
            ORDER BY dateMs DESC
            LIMIT 1
        )
        ORDER BY dateMs DESC
        LIMIT 1
    `, w((err, ret) => {
      if (err || !ret) {
        w.abort();
        return void complete(sess, dbError(err, "txByTxid"));
      }
      const block /*:Tables.tbl_blk_t*/ = ret[0];
      tx.blockTime = new Date(block.time).toISOString();
      tx.blockHash = block.hash;
      tx.blockHeight = block.height;
    }));
  }).nThen((w) => {
    return void complete(sess, null, tx);
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
  const path = sess.ctx.path['api'];
  Object.keys(path).map((k) => {
    Object.keys(path[k]).forEach((kk) => {
      out.push({ chain: k, network: kk });
    });
  });
  complete(sess, null, out);
};

const isHash = (input) => /^[0-9a-fA-F]{64}$/.test(input);
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
    config: undefined
  };
  if (req.url.startsWith('/api/status/enabled-chains')) {
    return void enabledChains(sess);
  }
  let parts = req.url.replace(/\?.*$/, '').split('/');
  let path = ctx.path;
  parts.shift();// leading ''
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
    path: Object.freeze({ api: Object.freeze(path) }),
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

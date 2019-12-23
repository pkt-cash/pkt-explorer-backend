// These are some functions which may be useful in the future but are currently
// not being used, added for future possible use.

const syncTransactions = (ctx, done) => {
  const txHashes = {};
  let needMore = false;
  nThen((w) => {
    let nt = nThen;
    [ MISSING_TX, MISSING_TXOUT, MISSING_TXIN ].forEach((x) => {
      nt = nt((w) => {
        if (Object.keys(txHashes).length >= 10000) { return; }
        query(ctx, `SELECT key FROM ${x} LIMIT 10000`, w((err, ret) => {
          if (!ret) {
            console.error(`Error SELECT FROM ${x} [${String(err)}]`);
            return;
          }
          console.error(`    [${ret.length}] results`);
          ret.forEach((x) => {
            txHashes[x.key] = 1;
          });
        }));
      }).nThen;
    });
    nt(w());
  }).nThen((w) => {
    const outputs = [];
    let hashes = Object.keys(txHashes);
    let done0 = false;
    const again0 = () => {
      if (hashes.length === 0) {
        done0 = true;
        return;
      }
      needMore = true;
      if (outputs.length > 5) {
        // too much stuff accumulated, sleep a bit
        return void setTimeout(w(again0), 200);
      }
      const thousandHashes = hashes.slice(0,1000);
      hashes = hashes.slice(1000);
      getTransactionsForHashes(ctx, thousandHashes, w((out) => {
        outputs.push(out);
        again0();
      }));
    };
    again0();

    const again1 = () => {
      if (hashes.length === 0 && outputs.length === 0 && done0) {
        return;
      }
      if (outputs.length === 0) {
        // pipeline stall, wait for more
        return void setTimeout(w(again1), 200);
      }
      submitTransactions(ctx, outputs.shift(), w(again1));
    };
    again1();
  }).nThen((w) => {
    done(needMore);
  });
};


const getTransactionsForHashes = (ctx, hashes, done) => {
  const transactions = [];
  let nt = nThen;
  console.error(`Getting [${hashes.length}] transactions`);
  hashes.forEach((th) => {
    nt = nt((w) => {
      rpcGetTransaction(ctx, th, w((err, tx) => {
        if (!tx) {
          console.error(`Failed to get transaction [${th}] ` +
            `[${String(err)}] will retry later...`);
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


const syncBlockTx = (ctx, done) => {
  const txBlock = [];
  const now = +new Date();
  let needMore = false;
  nThen((w) => {
    query(ctx, `SELECT asJson from ${TBL_BLK} WHERE hash IN (
      SELECT key FROM ${MISSING_BLK_TX} LIMIT 10000)`, w((err, ret) => {
      if (!ret) {
        console.error(`Error SELECT FROM ${MISSING_BLK_TX} [${String(err)}]`);
        return;
      }
      console.error(`    [${ret.length}] results`);
      ret.forEach((x) => {
        const json = JSON.parse(x.asJson);
        json.tx.forEach((tx) => {
          txBlock.push({ blockHash: json.hash, txid: tx });
        });
      });
    }));
  }).nThen((w) => {
    console.error(`INSERT INTO ${TBL_BLK_TX} (${txBlock.length} items)`);
    if (!txBlock.length) { return; }
    needMore = true;
    ctx.ch.insert(`INSERT INTO ${TBL_BLK_TX} (
      blockHash,
      txid,
      dateMs
    )`.replace(/\n/g, ''), txBlock.map((th) => {
      return [
        th.blockHash,
        th.txHash,
        now,
      ];
    })).exec(w((err, _) => {
      if (err) {
        throw err;
      }
    }));
  }).nThen((w) => {
    done(needMore);
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

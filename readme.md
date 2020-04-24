# PKT-Explorer Backend

This is a backend for the PKT block explorer, it implements two APIs. API v0 is based based on the 
[BitCore Node API](https://github.com/bitpay/bitcore/blob/master/packages/bitcore-node/docs/api-documentation.md)
but with some features added and others changed or removed. API v1 is an evolution of API v0 with
additional features and more standardized URL structure.

## Available frontends
* [gorhgorh/pkt-explorer](https://github.com/gorhgorh/pkt-explorer) is the best frontend for this
block explorer server, it is the most up to date.
* [cjdelisle/pkt-insight-fe](https://github.com/cjdelisle/pkt-explorer-insightfe) is a second frontend
which is forked from the [Bitcore Insight](https://github.com/bitpay/bitcore/tree/master/packages/insight)
project. This package does not work quite as well as the original Bitcore Insight codebase and should
be considered only as a prototype.

## How it works ?
This backend is based on the [ClickHouse](https://clickhouse.yandex/) database which is not only
blazing fast for the analytical type workloads typical of a block explorer, but also allows for the
creation of
[Materialized Views](https://www.altinity.com/blog/clickhouse-materialized-views-illuminated-part-1),
which allow the aggregation of data in real time as the data is received. For example, the `/richlist`
endpoint which computes balances of all active addresses in the blockchain takes 5 minutes and 16
seconds to compute using Bitcore's MongoDB database so it can only reasonably be run periodically,
leading to stale data. Even with ClickHouse it takes 9 seconds to compute the rich list, much better
but still far too much to wait for a page to load. But, using a Materialized View, the data can be
aggregated in real time as each new block is discovered, allowing the data to be always up to date
and instantly accessible.

## How to setup
First, you will need to setup a ClickHouse database server, you do not need to create any databases
or tables, this will be done by the *syncer*. Once you have ClickHouse setup, you should copy
`config.example.js` to `config.js` and then edit the file to add your username and password for
ClickHouse, and for the PKT/Bitcoin RPC.

You will need a recent version of nodejs (this software was developed using `v10.16.3`), then you
will need to install the dependencies using npm.

    npm install

Once you have this completed, launch the syncer and wait for it to insert the blockchain into
the database. This backend supports storing data on multiple blockchains but you will need one
syncer process per blockchain.

    node ./syncer.js --chain 'PKT/pkt'

Once it is synced you should see a log line looking like this:

    [snc] DEBUG: Chain synced

After the chain is synced (or before, if you're excited to see results), you can launch the server.
The server is chain-agnostic, it will serve data on whichever chains are specified in the
`config.js` file.

    node ./server.js --port 3000

The server is also stateless, so if you wish, you can run more than one process, however as must
of the computation is done at the ClickHouse level, it is unlikely that you will need more than
one.

## API Documentation
You can find documentation on the API versions in the /docs folder:

* [API fundamentals](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/api.md)
* [API v0 Documentation](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/apiv0.md)
* [API v1 Documentation](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/docs/apiv1.md)

## Porting to other blockchains
This project is designed to be portable to any bitcoin-like blockchain. It is somewhat reliant on
additional features to the RPC which are provided by pktd, but pktd itself is based on btcd and
support for bitcoin and bitcoin testnet are still present. The best way to get this project working
on another bitcoin-based blockchain is as follows:

1. Add the coin to pktd, note how --btc and --testnet are selected and follow this model
2. Update [lib/rewards.js](https://github.com/cjdelisle/pkt-explorer-backend/blob/master/lib/rewards.js)
to include the mining payout model for the blockchain you are adding
3. Launch the backend syncer and server using your chain
4. Launch the frontend and begin testing
5. Please make relevant pull requests

## License and Funding
This project is may be used and copied in accordance with the terms of the MIT license.

The development has been funded by the
[PKT Block Explorer Project](https://github.com/pkt-cash/ns-projects/blob/master/projects/2019_11_13_pkt_insight.md)

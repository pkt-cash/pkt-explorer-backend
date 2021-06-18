# PKT-Explorer Backend

This is a backend for the PKT block explorer, it implements two APIs. API v0 is based based on the 
[BitCore Node API](https://github.com/bitpay/bitcore/blob/master/packages/bitcore-node/docs/api-documentation.md)
but with some features added and others changed or removed. API v1 is an evolution of API v0 with
additional features and more standardized URL structure.

## Available frontends
* [pkt-cash/pkt-explorer](https://github.com/pkt-cash/pkt-explorer) is the best frontend for this
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

### Installing PKT Explorer Backend

1. Login to your server, these instructions assume you're using Fedora33 with tmux
2. Get in the tmux, create a new window `ctrl+b c`
3. Install docker https://docs.docker.com/engine/install/fedora/ (don't use the version from the OS)
4. install nodejs, git, and golang `dnf install nodejs git golang`
5. startup docker `service docker start`
    1. Start `sudo systemctl start docker`
6. add a user called `explorer` and with UID 101 (`useradd --uid 101 explorer`)
    * Using uid 101 will allow clickhouse docker to access the user's home directory
7. open a new window in tmux, name it pktd
    1. `su explorer` to change user
    2. Install pktd https://docs.pkt.cash/en/latest/pktd/
    3. Make a new folder called clickhouse_data, this will be used later `mkdir ~/clickhouse_data`
    4. Compile pktd
        1. `cd pktd`
        2. `./do`
    5. Launch pktd with `./bin/pktd -ux -Px --txindex` and leave it in that window to sync
8. make a new window, name it clickhouse-server
    1. Launch clickhouse `docker run -it -p localhost:8123:8123 --rm --name clickhouse-server --label=disable --ulimit nofile=262144:262144 --volume=/home/explorer/clickhouse_data:/var/lib/clickhouse -e CLICKHOUSE_PASSWORD=password yandex/clickhouse-server`
9. make a new window, call it clickhouse-client
    1. launch clickhouse client `docker exec -it clickhouse-server clickhouse-client --password=password`
    2. You should see a prompt like the following `32d4f36b8fe1 :)`
        * In this window, you will be able to query the db
10. Create a new window, call it syncer
    1. `su explorer`
    2. `cd ~`
    3. `git clone https://github.com/pkt-cash/pkt-explorer-backend`
    4. `cd pkt-explorer-backend`
    5. `npm install`
    6. `cp config.example.js config.js`
    7. launch syncer: `node ./syncer.js --chain PKT/pkt`
    8. check that it seems to be adding the blockchain to clickhouse
11. Create a new window, call it server
    1. `su explorer`
    2. launch server: `node ./server.js --port 3002`
12. Return to a bash window
    1. check the server is running:
        * `curl localhost:3002/api/v1/status/enabled-chains`
        * Should say PKT chain is enabled
    2. check the server is connecting to the db
        * `curl localhost:3002/api/v1/PKT/pkt/chain/down/1/1`
        * Should provide block information about a past block

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

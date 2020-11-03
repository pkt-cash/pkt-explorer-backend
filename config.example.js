module.exports = {
  clickhouse: {
    logLevel: 'info',
    host: '192.168.1.27',
    user: 'default',
    password: '<place your clickhouse password here>',
    port: 8123,
    protocol: 'http:',
    dataObjects: true,
    format: 'JSONEachRow',
    queryOptions: {
      // database: "test",
      // profile: "web",
      // readonly: 2,
      // force_index_by_date: 1,
      // max_rows_to_read: 10 * 1e6,
    },
    readonly: false,
  },
  logLevel: 'info',
  enabledChains: {
    'PKT/pkt': {
      clickhouseDb: 'pkt_insight2',
      // normal, multisig, witnessKeyHash, witnessScriptHash
      bs58Prefixes: [ 0x75, 0x38, 0xa3, 0x22 ],
      bech32Prefix: 'pkt',
      bitcoinRPC: {
        protocol: 'https',
        user: 'x',
        pass: 'x',
        host: '127.0.0.1',
        port: 64765,
        rejectUnauthorized: false
      }
    }
  }
};

#!/bin/bash
export OUT_FILE=./test/apitest_gen0.js
export SERVER=https://pkt.cash
echo 'api/v1/status/enabled-chains Apiv1_enabledChains
api/v1/PKT/pkt/stats/richlist/3/1 Apiv1_richlist_result
api/v1/PKT/pkt/ns Apiv1_ns
api/v1/PKT/pkt/ns/candidates Apiv1_nsCandidates
api/v1/PKT/pkt/address/pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2 Apiv1_address
api/v1/PKT/pkt/address/pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2/coins/2/1 Apiv1_addressCoins
api/v1/PKT/pkt/address/pkt1q6hqsqhqdgqfd8t3xwgceulu7k9d9w5t2amath0qxyfjlvl3s3u4sjza2g2/income/5/1 Apiv1_addressIncome
api/v1/PKT/pkt/block/9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8 Apiv1_block
api/v1/PKT/pkt/block/9c0c1c59d9fca48b8abf1f2b06b059c59e81980ba3f73a68c7223637de0072d8/coins Apiv1_blockCoins
api/v1/PKT/pkt/chain/up/1/500 Apiv1_chainUp
api/v1/PKT/pkt/chain/down/1/1 Apiv1_chainDown
api/v1/PKT/pkt/tx/1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76 Apiv1_tx
api/v1/PKT/pkt/tx/1301091c426550a47e95b070b3cce51d91f7c625d4053853cda8fcc61edecf76/detail Apiv1_txDetail
api/v1/PKT/pkt/packetcrypt/4e72138f8cfeadc30abe17022d690e7e2cb9940eafd818ae707e0faa287c562c Apiv1_packetcryptBlock
api/v1/PKT/pkt/packetcrypt/stats/1/1 Apiv1_packetcryptStats' \
| awk '{
    print "echo -n '\''const "$2"_sample /*:"$2"*/ = '\'' >> $OUT_FILE";
    print "curl ${SERVER}/"$1" >> $OUT_FILE";
    print "echo '\'';\nmodule.exports."$2"_sample = "$2"_sample;'\'' >> $OUT_FILE";
}' | bash
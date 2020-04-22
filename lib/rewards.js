/*@flow*/
/* global BigInt */
/*::
const BigInt = (x:any)=>0;
export type RewardInfo_t = {
    alreadyMined: string,
    reward: string,
    remaining: string,
};
*/

const PKT_MAX_UNITS = BigInt("6441420151828656000");
const PKT_BLOCKS_PER_PERIOD = 144000;
const pktRewardByPeriod = (period /*:number*/) => {
  const periods = BigInt(period);
  const a = (BigInt(9) ** periods) * BigInt(4166 * 0x40000000);
  const b = (BigInt(10) ** periods);
  return a / b;
};
module.exports.pkt = (block /*:number*/) /*RewardInfo_t*/ => {
    const period = Math.floor(block / PKT_BLOCKS_PER_PERIOD);
    const blockInPeriod = block - (period * PKT_BLOCKS_PER_PERIOD);
    let alreadyMined = BigInt(0);
    for (let i = 0; i < period; i++) {
        alreadyMined += pktRewardByPeriod(i) * BigInt(PKT_BLOCKS_PER_PERIOD);
    }
    const rip = pktRewardByPeriod(period);
    alreadyMined += rip * BigInt(blockInPeriod);
    const remaining = PKT_MAX_UNITS - alreadyMined - rip;
    return {
        alreadyMined: alreadyMined.toString(),
        reward: rip.toString(),
        remaining: remaining.toString()
    };
};
module.exports.pkt.unitsPerCoin = 0x40000000
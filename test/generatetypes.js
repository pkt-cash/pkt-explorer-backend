/*@flow*/
// SPDX-License-Identifier: MIT

/*::type T = { f: string, p: string, maybe?: bool, _shape?:Object };*/
const string = () => ({f:'string',p:'PropTypes.string',_shape:undefined}); // any type of string
const number = () => ({f:'number',p:'PropTypes.number',_shape:undefined}); // any type of number (usually float)
const hexstr = () => string();  // string of some length which is base16
const struint = () => string(); // string representation of a (potentially big) unsigned int
const coins = () => struint();  // number of atomic units of coin
const uint = () => number();    // positive integer or 0
const uint32 = () => number();  // positive integer <2**32, or 0
const hash = () => hexstr();    // hex representation of a 256 bit hash
const datestr = () => string(); // date string
const addr = () => string();    // crypto address
const enumt = (type, possibilities) => {
    const out = type();
    out.f = possibilities.join('|');
    out.p = `PropTypes.oneOf([${possibilities.join(',')}])`;
    return out;
};

const maybe = (t /*:T*/) => t

const types /*:{[string]:T}*/ = {};
const namedType = (name) => ({p:name,f:name,_shape:undefined});
const array = (t) => ({f:`Array<${t.f}>`,p:`PropTypes.arrayOf(${t.p})`});
const obj = (shape) => {
    const f = ['{'];
    const p = ['PropTypes.exact({'];
    for (const field in shape) {
        f.push(`  ${field}: ${shape[field].f},`);
        p.push(`  ${field}: ${shape[field].p},`);
    }
    f.push('}');
    p.push('})');
    return {f:f.join('\n'),p:p.join('\n'),_shape:shape};
};
const extend = (tname, o/*:T*/) => {
    if (typeof(types[tname]._shape) !== 'object') {
        throw new Error(`can't extend ${tname} not an object`);
    } else if (typeof(o._shape) !== 'object') {
        throw new Error(`can't extend ${String(o)}, not an object`);
    }
    return obj(Object.assign(JSON.parse(JSON.stringify(types[tname]._shape)), o._shape));
}
const define = (name, t/*:T*/) => {
    types[name] = t;
    return name;
};

define('AddrStats_t', obj({
    unconfirmedReceived: coins(),
    confirmedReceived: coins(),
    balance: coins(),
    spending: coins(),
    spent: coins(),
    burned: coins(),
    recvCount: uint32(),
    mineCount: uint32(),
    spentCount: uint32(),
    balanceCount: uint32(),
    mined24: coins(),
}));
define('Block_t', obj({
    hash: hash(),
    height: uint(),
    version: uint(),
    size: uint(),
    merkleRoot: hash(),
    time: datestr(),
    nonce: uint32(),
    bits: uint32(),
    difficulty: number(),
    previousBlockHash: hash(),
    transactionCount: uint32(),
    dateMs: struint(),
    pcAnnCount: maybe(struint()),
    pcAnnDifficulty: maybe(number()),
    pcBlkDifficulty: maybe(number()),
    pcVersion: maybe(uint()),
    networkSteward: maybe(addr()),
    blocksUntilRetarget: uint32(),
    retargetEstimate: number(),
}));
define('Transaction_t', obj({
    txid: hash(),
    size: uint32(),
    vsize: uint32(),
    version: uint32(),
    locktime: uint32(),
    inputCount: uint32(),
    outputCount: uint32(),
    value: coins(),
    coinbase: hexstr(),
    firstSeen: datestr(),
    dateMs: struint(),
}));
define('CoinAggregate_t', obj({
    address: addr(),
    value: coins(),
    spentcount: uint32(),
}));
define('TransactionDetail_t', extend('Transaction_t', obj({
    blockTime: maybe(datestr()),
    blockHash: maybe(hash()),
    blockHeight: maybe(uint32()),
    input: array(namedType('CoinAggregate_t')),
    output: array(namedType('CoinAggregate_t')),
})));
define('Coins_t', obj({
    address: addr(),
    mintTxid: hash(),
    mintIndex: uint32(),
    dateMs: struint(),
    value: coins(),
    coinbase: enumt(uint32, [0,1,2]),
    voteFor: maybe(addr()),
    voteAgainst: maybe(addr()),
    seenTime: datestr(),
    mintBlockHash: maybe(hash()),
    mintHeight: maybe(uint32()),
    mintTime: maybe(datestr()),
    spentTxid: maybe(hash()),
    spentTxinNum: maybe(uint32()),
    spentBlockHash: maybe(hash()),
    spentHeight: maybe(uint32()),
    spentTime: maybe(datestr()),
    spentSequence: maybe(uint32()),
    prevState: enumt(string, ['"nothing"', '"mempool"', '"block"', '"spending"', '"spent"', '"burned"']),
    currentState: enumt(string, ['"mempool"', '"block"', '"spending"', '"spent"', '"burned"']),
}));

const or = (a, b) => ({f: `${a} | ${b}`,p:`PropTypes.oneOfType([${a}, ${b}])`,_shape:undefined})
define('RpcError_t', obj({
    code: uint32(),
    error: string(),
    fn:	string(),
}));
const rpc = (name, t) => {
    define(`${name}_result`, t);
    define(name, or('RpcError_t', `${name}_result`));
};
const pageRpc = (name, resultT) => {
    define(`${name}_resultElem`, resultT);
    define(`${name}_result`, obj({
        results: array(namedType(`${name}_resultElem`)),
        prev: string(),
        next: string(),
    }));
    define(name, or('RpcError_t', `${name}_result`));
};


rpc('Apiv1_enabledChains', array(obj({
    chain: string(),
    network: string(),
})));
pageRpc('Apiv1_richlist', obj({
    address: addr(),
    balance: coins(),
}));
rpc('Apiv1_ns', obj({
    networkSteward: addr(),
	votesAgainst: coins(),
	votesNeeded: coins(),
}));
pageRpc('Apiv1_nsCandidates', obj({
    candidate: addr(),
    votesFor: coins(),
    votesAgainst: coins(),
}));
rpc('Apiv1_address', namedType('AddrStats_t'));
pageRpc('Apiv1_addressCoins', namedType('TransactionDetail_t'));
pageRpc('Apiv1_addressIncome', obj({
    date: datestr(),
    received: coins(),
}));
rpc('Apiv1_block', namedType('Block_t'));
pageRpc('Apiv1_blockCoins', namedType('TransactionDetail_t'));
pageRpc('Apiv1_chainUp', namedType('Block_t'));
pageRpc('Apiv1_chainDown', namedType('Block_t'));
rpc('Apiv1_tx', namedType('TransactionDetail_t'));
rpc('Apiv1_txDetail', obj({
    inputs: array(namedType('Coins_t')),
    outputs: array(namedType('Coins_t')),
    prev: string(),
    next: string(),
}));
rpc('Apiv1_packetcryptBlock', obj({
	blockBits: number(),
	blockEncryptions: number(),
}));
pageRpc('Apiv1_packetcryptStats', obj({
    date: datestr(),
    pcVersion: uint32(),
    bitsPerSecond: uint(),
    encryptionsPerSecond: uint(),
}));

if (process.argv.indexOf('--flow') > -1) {
    console.log('// SPDX-License-Identifier: MIT');
    for (const t in types) {
        console.log(`export type ${t} = ${types[t].f};`);
    }
} else if (process.argv.indexOf('--proptypes') > -1) {
    console.log('// SPDX-License-Identifier: MIT');
    console.log(`const PropTypes = require('prop-types');`);
    for (const t in types) {
        console.log(`const ${t} = module.exports.${t} = ${types[t].p};`);
    }
} else {
    console.error('usage: generatetypes.js OUTTYPE');
    console.error('  OUTTYPE');
    console.error('    --flow       # generate flow/ts type info');
    console.error('    --proptypes  # proptypes info');
}
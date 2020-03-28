/*@flow*/
/* global BigInt */
// SPDX-License-Identifier: MIT
'use strict';
const Zlib = require('zlib');
const Http = require('http');
const Querystring = require('querystring');

const nThen = require('nthen');
const ClickHouse = require('@apla/clickhouse');

const Log = require('./log.js');

/*::
import type { IncomingMessage } from 'http';

import type { Log_t } from './log.js';
import type { Type_t } from './types.js';
import type { ClickHouseTypes_t } from './types_gen.js';
type Config_t = {
  host: string,
  user: string,
  password: string,
  port: number,
  protocol: 'http:'|'https:',
  dataObjects: boolean,
  format: string,
  readonly: boolean,
  queryOptions: {
    database?: string,
    profile?: string,
    readonly?: number,
    force_index_by_date?: number,
    max_rows_to_read?: number,
  },
  db: string,
  sessionId?: string,
};

const __int_clickhouse = new ClickHouse();
type ClickHouseInternal_t = typeof(__int_clickhouse);
export type ClickHouse_t = {
  _: ClickHouseInternal_t,
  log: Log_t,
  opts: Config_t,

  sessionId: () => string,
  withSession: (s?: string) => ClickHouse_t,
  withDb: (db: string) => ClickHouse_t,
  withTempTable: <X>(
    tempTable: Table_t<X>,
    tempData: Array<X>,
    doWithTemp: (ClickHouse_t, Table_t<X>, done:(?Error)=>void)=>void,
    done: (?Error)=>void
  ) => void,
  mergeUpdate: <X,Y>(
    tempTable: Table_t<X>,
    newData: Array<X>,
    outTable: Table_t<Y>,
    keyFields: Array<Field_t>,
    fieldMapper: (string, string, Table_t<X>) => string|void,
    done: (?Error)=>void
  ) => void,
  insert: <X:Object>(
    table: Table_t<X>,
    objects: Array<X>,
    then: (?Error)=>void
  ) => void,
  query: (
    q: string,
    then: (?Error, ?Array<Object>)=>void
  ) => void,
  modify: (
    q: string,
    then: (?Error, ?Array<Object>)=>void
  ) => void,
};

export type Field_t = {
  name: string,
  type: Type_t
};
export type Fields_t = {
  [string]: Field_t
};
export type Engine_t = {
  string: string
};
export type TableDesc_t = {
    [string]: Type_t
};
export type Table_t<X> = {
  _: {
    name: ?string,
    ch: string,
    engine: ?Engine_t,
    order: ?Array<Field_t>
  },
  // name: ?string,
  // flow: Object,
  // ch: string,
  fields: ()=>Fields_t,
  withEngine: ((a:Fields_t)=>Engine_t)=>Table_t<X>,
  withOrder: ((a:Fields_t)=>Array<Field_t>)=>Table_t<X>,
  queryString: (?Array<Option_t>)=>string,
  typedef: (string)=>string,
  clone: (string)=>Table_t<X>,
  name: ()=>string,
};
export type Option_t = { string: string, type: 'Option' };
export type CreateTableArgs_t<X> = {
  opts: Array<Option_t>,
  name: string,
  def: Table_t<X>
};
export type ChType_t = { _flow:Object, ch:string }
export type ChTypes_t = {
  [string]: ( ChType_t | (a:string)=>ChType_t | (a:number)=>ChType_t )
};
export type AddFunc_t = <X:Table_t<*>|MaterializedView_t<*>>(string, X) => X;
export type Database_t = {
  tables: <U>() => { [string]: Table_t<U> | MaterializedView_t<U> },
  tempTables: <U>() => { [string]: Table_t<U> | MaterializedView_t<U> },
  add: AddFunc_t,
  addTemp: AddFunc_t,
  name: string,
  create: (ClickHouse_t, Array<Option_t>, done:(?Error)=>void) => void
};
export type Select_t<X> = {
  _: {
    // This table is on Y where Y extends X, but we'll say it's a table X
    table: Table_t<X>,
    fields: Fields_t
  },
  fields: ((Table_t<X>) => Fields_t) => Select_t<X>,
  queryString: (?Array<Option_t>)=>string,
  typedef: (string)=>string,
};
export type MaterializedViewDesc_t<X> = {
  to?: Table_t<any>,
  as: Select_t<X>,
};
export type MaterializedView_t<X> = {
  _: {
    name: ?string,
    desc: MaterializedViewDesc_t<X>,
    fieldMap: Array<{[string]: Field_t}>,
    engine: ?Engine_t,
    order: ?Array<Field_t>
  },
  name: () => string,
  withEngine: ((Fields_t) => Engine_t)=>MaterializedView_t<X>,
  withOrder: ((Fields_t) => Array<Field_t>)=>MaterializedView_t<X>,
  queryString: (?Array<Option_t>)=>string,
  typedef: (string)=>string,
};
*/

const types = module.exports.types = (Object.freeze((() => {
  const _ = {};
  _.FixedString = (num /*:number*/) => {
    return { _flow: 'string', ch: `FixedString(${String(num)})`, writable: true };
  };
  _.String = { _flow: 'string', ch: 'String', writable: true };
  _.DateTime = (tz /*:string*/) => {
    return { _flow: 'Date', ch: `DateTime('${tz}')`, writable: true };
  };
  _.DateTime_number = (tz /*:string*/) => {
    return { _flow: 'number', ch: `DateTime('${tz}')`, writable: true };
  };
  _.Enum = (enums /*:{[string]:number}*/) => {
    return { _flow: 'number', ch: `Enum(${
      Object.keys(enums).map((t) => `'${t}' = ${String(enums[t])}`).join(', ')
    })`, writable: true };
  };
  _.Alias = (t /*:Type_t*/, expr /*:string*/) => {
    return { _flow: t._flow, ch: `${t.ch} ALIAS ${expr}`, writable: false};
  };
  for (let n = 8; n <= 64; n *= 2) {
    _['Int' + n] = { _flow: 'number', ch: 'Int' + n, writable: true };
    _['UInt' + n] = { _flow: 'number', ch: 'UInt' + n, writable: true };
    _['UInt' + n + '_string'] = { _flow: 'string', ch: 'UInt' + n, writable: true };
    _['Int' + n + '_string'] = { _flow: 'string', ch: 'UInt' + n, writable: true };
    if (n >= 32) {
      _['Float' + n] = { _flow: 'number', ch: 'Float' + n, writable: true };
    }
  }
  return _;
})())/*:ClickHouseTypes_t*/);
module.exports.GLOBAL = {
  typedef: () => {
    const out = [];
    out.push("import type { Type_t } from './types.js';");
    out.push('export type ClickHouseTypes_t = {');
    Object.keys(types).map((t) => {
      if (typeof(types[t]) === 'function') {
        out.push(`  ${t}: ${types[t].toString().replace(/[\/\*]|=>[^]+$/g,'')}=> Type_t,`);
      } else {
        out.push(`  ${t}: Type_t,`);
      }
    });
    out.push('};');
    return out.join('\n');
  }
};

const toCh = (obj /*:TableDesc_t*/) => {
  if (Array.isArray(obj)) {
    throw new Error("arrays unsupported");
  }
  if (typeof(obj) === 'object') {
    return '(' + Object.keys(obj).map((k) => {
      const o = obj[k];
      if (o._flow && o.ch) {
        return k + ' ' + o.ch;
      } else {
        throw new Error("unsupported type " + JSON.stringify(o));
      }
    }).join() + ')';
  }
  throw new Error(obj + ' unsupported');
};

const mkField = (name /*:string*/, type /*:Type_t*/) /*:Field_t*/ => {
  return Object.freeze({
    name: name,
    type: type
  });
};

const objFields = (obj /*:TableDesc_t*/) /*:Fields_t*/ => {
  if (typeof(obj) !== 'object') {
    throw new Error();
  }
  const out = {};
  Object.keys(obj).forEach((k) => {
    out[k] = mkField(k, obj[k]);
  });
  return Object.freeze(out);
};

const orderByClause = (order /*:?Array<Field_t>*/) /*:string*/ => {
  if (!order) { return ''; }
  const names = order.map((x) => x.name);
  if (names.length > 1) {
    return `ORDER BY (${names.join()})`;
  }
  if (names.length < 1) {
    throw new Error("empty order clause");
  }
  return 'ORDER BY ' + names[0];
};

const engineClause = (engine /*:?Engine_t*/) /*:string*/ => {
  if (!engine) { return ''; }
  return `ENGINE ${engine.string}`;
};

const IF_NOT_EXISTS = module.exports.IF_NOT_EXISTS = ({
  string: 'IF NOT EXISTS',
  type: 'Option'
} /*:Option_t*/);
const TEMPORARY = module.exports.TEMPORARY = ({
  string: 'TEMPORARY',
  type: 'Option'
} /*:Option_t*/);

const orderFunction = (f, fields) => {
  const order = f(fields);
  if (!Array.isArray(order)) {
    throw new Error("order must be an array");
  }
  const fieldValues = Object.values(fields);
  order.forEach((f) => {
    if (typeof(f) !== 'object') {
      throw new Error(String(f) + " is not a valid field, possible fields: " +
        JSON.stringify(Object.keys(fields)));
    }
    if (fieldValues.indexOf(f) < 0) {
      throw new Error("Field " + f.name + " is not in the table fields, possible fields: " +
        JSON.stringify(Object.keys(fields)));
    }
  });
  return order;
};

const typedef = (typename, fields) => {
  return `export type ${typename} = {\n` +
    Object.keys(fields).map((f) => {
      return `  ${f}: ${fields[f].type._flow}`;
    }).join(',\n') +
  '\n};';
};

const table = module.exports.table = /*::<X>*/(obj /*:TableDesc_t*/) /*:Table_t<X>*/ => {
  const fields = objFields(obj);
  const tdef = Object.freeze({
    _: {
      ch: toCh(obj),
      fields: fields,
      engine: undefined,
      order: undefined,
      name: undefined
    },
    withEngine: (f) => {
      tdef._.engine = Object.freeze(f(fields));
      return tdef;
    },
    withOrder: (f) => {
      tdef._.order = Object.freeze(orderFunction(f, fields));
      return tdef;
    },
    name: () => {
      if (tdef._.name) {
        return tdef._.name;
      }
      throw new Error("name of table not defined");
    },
    fields: () => tdef._.fields,
    queryString: (opts) => {
      opts = opts || [];
      if (opts.indexOf(TEMPORARY) === -1) {
        if (!tdef._.order) {
          throw new Error(`Table ${tdef.name()} is missing an order`);
        }
        if (!tdef._.engine) {
          throw new Error(`Table ${tdef.name()} is missing an engine`);
        }
      }
      const out = [
        'CREATE',
        (opts.indexOf(TEMPORARY) > -1) ? TEMPORARY.string : '',
        'TABLE',
        (opts.indexOf(IF_NOT_EXISTS) > -1) ? IF_NOT_EXISTS.string : '',
        tdef.name(),
        tdef._.ch,
      ];
      if (opts.indexOf(TEMPORARY) === -1) {
        out.push(
          engineClause(tdef._.engine),
          orderByClause(tdef._.order)
        );
      }
      return out.filter((x)=>x !== '').join(' ');
    },
    clone: (withName) => {
      const out = table(obj);
      out._.engine = tdef._.engine;
      out._.order = tdef._.order;
      out._.name = withName;
      return out;
    },
    typedef: (typename) => typedef(typename, fields)
  });
  return tdef;
};

module.exports.select = /*::<X>*/(t /*:Table_t<X>*/) /*:Select_t<X>*/ => {
  const sel = Object.freeze({
    _: {
      table: t,
      fields: {}
    },
    fields: (f) => {
      sel._.fields = f(t);
      return sel;
    },
    queryString: (opts) => {
      opts = opts || [];
      return `SELECT ${Object.keys(sel._.fields).join()} FROM ${t.name()}`;
    },
    typedef: (typename) => typedef(typename, sel._.fields)
  });
  return sel;
};

module.exports.materializedView = /*::<X>*/(
  desc /*:MaterializedViewDesc_t<X>*/
) /*:MaterializedView_t<X>*/ => {
  const out = Object.freeze({
    _: {
      name: undefined,
      desc: desc,
      fieldMap: [],
      engine: undefined,
      order: undefined,
    },
    name: () => {
      if (typeof(out._.name) === 'string') { return out._.name; }
      throw new Error("name was not yet defined");
    },
    withEngine: (f) => {
      out._.engine = f(desc.as._.fields);
      return out;
    },
    withOrder: (f) => {
      out._.order = orderFunction(f, desc.as._.fields);
      return out;
    },
    typedef: (typename) => out._.desc.as.typedef(typename),
    queryString: (opts) => {
      opts = opts || [];
      if (Boolean(out._.engine) === Boolean(desc.to)) {
        throw new Error("When creating a materialized view, you must specify " +
          "`to` OR `engine` but not both");
      }
      if (Boolean(out._.engine) !== Boolean(out._.order)) {
        throw new Error("When creating a materialized view, you must specify " +
          "`order` IF you specify `engine`, but otherwise not");
      }
      return [
        'CREATE MATERIALIZED VIEW',
        (opts.indexOf(IF_NOT_EXISTS) > -1) ? IF_NOT_EXISTS.string : '',
        out.name(),
        (desc.to) ? `TO ${desc.to.name()}` : '',
        engineClause(out._.engine),
        orderByClause(out._.order),
        `AS ( ${desc.as.queryString([])} )`,
      ].filter((x)=>x !== '').join(' ');
    }
  });
  if (desc.to) {
    const to = desc.to;
    const fields = {};
    const toFields = to.fields();
    // TODO: Either reorder fields or at least warn that they're out of order...
    Object.keys(toFields).forEach((n) => {
      const obj = {};
      const field = obj[n] = desc.as._.fields[n];
      if (!field) {
        throw new Error(`Table ${to.name()} has field ${n} but ` +
          `there is no such field in the materialized view query ${desc.as.queryString()}`);
      }
      if (field.type.ch !== toFields[n].type.ch) {
        throw new Error(`Field ${n} in TO table ${to.name()} has type ${toFields[n].type.ch} ` +
          `but SELECT query ${desc.as.queryString()} of field has type ${field.type.ch}`);
      }
      fields[n] = true;
    });
    Object.keys(desc.as._.fields).forEach((n) => {
      if (!fields[n]) {
        throw new Error(`Materialized view query ${desc.as.queryString()} has field ${n} but ` +
          `TO table [${to.queryString()}] has only fields [${Object.keys(toFields).join()}]`);
      }
    });
  }
  return out;
};

module.exports.database = (name /*:string*/) /*:Database_t*/ => {
  const tables = {};
  const tempTables = {};
  return Object.freeze({
    tables: () => tables,
    tempTables: () => tempTables,
    name: name,
    add: (name, desc) => {
      if (name in tables) {
        throw new Error(`table ${name} is already defined`);
      }
      desc._.name = name;
      tables[name] = desc;
      // Verify that it works...
      desc.queryString([]);
      // $FlowFixMe flow, you're drunk, this is fine
      return desc;
    },
    addTemp: (name, desc) => {
      desc._.name = name;
      tempTables[name] = desc;
      // $FlowFixMe flow, you're drunk, this is fine
      return desc;
    },
    create: (
      ch /*:ClickHouse_t*/,
      opts /*: Array<Option_t>*/,
      done /*:(?Error)=>void*/
    ) => {
      let nt = nThen;
      let err;
      Object.keys(tables).forEach((name) => {
        nt = nt((w) => {
          if (err) { return; }
          const qs = tables[name].queryString(opts);
          //ch.log.debug(qs);
          ch.modify(qs, w((e) => {
            if (e) { err = e; }
          }));
        }).nThen;
      });
      nt((_) => {
        done(err);
      });
    }
  });
};

const fieldName = (field /*:Field_t*/) /*:string*/ => {
  if (!field || !field.name) { throw new Error(); }
  return field.name;
};

module.exports.engines = {
  ReplacingMergeTree: (field /*:Field_t*/) /*:Engine_t*/ => {
    return Object.freeze({ string: `ReplacingMergeTree(${fieldName(field)})` });
  }
};

const computeOptions = (ch /*:ClickHouse_t*/, readOnly /*:bool*/) => {
  const opts = JSON.parse(JSON.stringify(ch.opts));
  opts.queryOptions = opts.queryOptions || {};
  opts.queryOptions.database = opts.queryOptions.database || ch.opts.db;
  const sid = opts.queryOptions.session_id || ch.opts.sessionId;
  if (sid) { opts.queryOptions.session_id = sid; }
  if (readOnly !== false) { opts.readonly = 1; }
  return opts;
};

const query = (
  ch /*:ClickHouse_t*/,
  readOnly /*:boolean*/,
  q /*:string*/,
  then /*:(?Error, ?Array<Object>)=>void*/
) => {
  //console.log(q.split('\n')[0]);
  const opts = computeOptions(ch, readOnly);
  const startTime = +new Date();
  const doLog = (result) => {
    ch.log.debug(`${ch.opts.db} ${q.replace(/\n +/g, ' ').slice(0,50)}... (${result})`,
      (((+new Date()) - startTime) / 1000) + ' seconds');
  };
  ch._.query(q, opts, (err, ret) => {
    if (err) {
      doLog('error');
      err.message += ` (query: [${q}])`;
      //console.error("Error", err);
      return void then(err);
    }
    if (typeof(ret) === 'object') {
      // already parsed by @appa/clickhouse
      return void then(undefined, [ ret ]);
    }
    let parsed;
    try {
      parsed = ret.split('\n').filter((x)=>x).map(JSON.parse);
    } catch (e) {
      doLog('error');
      return void then(new Error("Unparsable reply " +
        JSON.stringify(ret) + ' ' + e + ' ' + typeof(ret)));
    }
    doLog(`${parsed.length} results`);
    then(undefined, parsed);
  });
};

const twoDec = (n) => Math.floor(n * 100) / 100;

const formatSize = (size) => {
  if (size > (1<<20)) { return twoDec(size / (1<<20)) + ' MB'; }
  if (size > (1<<10)) { return twoDec(size / (1<<10)) + ' KB'; }
  return size + ' bytes';
};

const insert = /*::<X:Object>*/(
  ch /*:ClickHouse_t*/,
  table /*:Table_t<X>*/,
  objects /*:Array<X>*/,
  then /*:(?Error)=>void*/
) => {
  if (objects.length < 1) { return void then(); }
  const opts = computeOptions(ch, false);
  const fields = Object.keys(table.fields());
  let err = false;
  const objs = objects.map((r) => {
    const out = {};
    if (Object.keys(r).length > fields.length) {
      Object.keys(r).forEach((f) => {
        if (fields.indexOf(f) === -1) {
          ch.log.warn(`inserting ${table.name()}: extra field ${f} will be ignored`);
        }
      });
    }
    fields.forEach((f) => {
      if (typeof(r[f]) === 'undefined') {
        err = true;
        then(new Error(`Field ${f} is undefined`));
        return false;
      }
      out[f] = r[f];
    });
    return JSON.stringify(out);
  });
  if (err) { return; }

  const params = ch._.getReqParams();
  params.path = '/?' + Querystring.stringify(
    Object.assign({}, ch._.options.queryOptions, opts.queryOptions, {
      query: `INSERT INTO ${table.name()} FORMAT JSONEachRow`
    })
  );
  (params.headers = params.headers || {})['Content-Encoding'] = 'gzip';
  let compressed;
  const startTime = +new Date();
  nThen((w) => {
    Zlib.gzip(objs.join('\n') + '\n', w((err, ret) => {
      if (err) {
        w.abort();
        return void then(err);
      }
      compressed = ret;
    }));
  }).nThen((w) => {
    Http.request(params, w((res /*:IncomingMessage*/) => {
      const data = [];
      res.on('data', (d) => data.push(d));
      res.on('end', w(() => {
        if (res.statusCode === 200 && data.join('') === '') { return; }
        console.error(`Response ${res.statusCode}: ${data.join('')}`);
        if (res.statusCode !== 200) {
          w.abort();
          then(new Error(data.join('')));
        }
      }));
    })).end(compressed);
  }).nThen((w) => {
    ch.log.debug(`INSERT INTO ${table.name()} (${objects.length} items, ` +
      formatSize(compressed.length) + ')',
      ( ((+new Date()) - startTime) / 1000 ) + ' seconds');
    then();
  });
};

const randId = module.exports.randId = () =>
  [1,1].map((_)=>Math.random().toString(16).replace('0.','')).join('');

const getKeyFields = /*::<X>*/(table /*:Table_t<X>*/) => {
  return table._.order || [];
};

const mergeUpdate = /*::<X,Y>*/(
  ch0 /*:ClickHouse_t*/,
  tempTableProto /*:Table_t<X>*/,
  newData /*:Array<X>*/,
  outTable /*:Table_t<Y>*/,
  keyFields /*:Array<Field_t>*/,
  fieldMapper /*:(string, string, Table_t<X>) => string|void*/,
  done /*:(?Error)=>void*/
) => {
  if (keyFields.length === 0) {
    return void done(new Error("No key fields specified"));
  }
  const outKeyFieldNames = getKeyFields(outTable).map((f)=>f.name);
  if (!outKeyFieldNames.length) {
    return void done(new Error(`Table ${outTable.name()} has no order by fields`));
  }
  const keyFieldNames = keyFields.map((x)=>x.name);
  for (let i = 0; i < keyFieldNames.length; i++) {
    const f = keyFieldNames[i];
    if (!outTable.fields()[f]) {
      return void done(new Error(`key field ${f} missing from ${outTable.name()}`));
    } else if (!tempTableProto.fields()[f]) {
      return void done(new Error(`key field ${f} missing from temp table ${tempTableProto.name()}`));
    } else if (outTable.fields()[f].type.ch !== tempTableProto.fields()[f].type.ch) {
      return void done(new Error(`key field ${f} has different type for output table ` +
        `(${outTable.fields()[f].type.ch}) than temp table ${tempTableProto.fields()[f].type.ch}`));
    }
  }
  const ch = ch0.withSession();
  ch.withTempTable(tempTableProto, newData, (ch, tempTable, done) => {
    ch.modify(`INSERT INTO ${outTable.name()}
      SELECT
        ${Object.keys(outTable.fields()).filter((f) => (
          outTable.fields()[f].type.writable
        )).map((f) => {
          const fm = fieldMapper(f, 'selection', tempTable);
          if (typeof(fm) === 'string') {
            return fm;
          } else if (tempTable.fields()[f]) {
            return `${tempTable.name()}.${f} AS ${f}`;
          }
          return `selection.${f} AS ${f}`;
        }).join(',\n')}
      FROM (
        SELECT * FROM ${outTable.name()}
        WHERE (${keyFieldNames.join(',')}) IN (
          SELECT ${keyFieldNames.join(',')} FROM ${tempTable.name()}
        )
        ORDER BY ${outKeyFieldNames.join()}, dateMs DESC
        LIMIT 1 BY (${outKeyFieldNames.join()})
      ) AS selection
      RIGHT JOIN ${tempTable.name()} ON
        ${keyFieldNames.map((f) => (
          `selection.${f} = ${tempTable.name()}.${f}`
        )).join(' AND ')}
    `, (err, ret) => {
      if (!err && ret && ret.length) {
        err = new Error(`Unexpected response ${ret.join()}`);
      }
      done(err);
    });
  }, done);
};

const withTempTable = /*::<X>*/(
  ch0 /*:ClickHouse_t*/,
  tempTableProto /*:Table_t<X>*/,
  tempData /*:Array<X>*/,
  doWithTemp /*:(ClickHouse_t, Table_t<X>, done:(?Error)=>void)=>void*/,
  done /*:(?Error)=>void*/
) => {
  const ch = ch0.withSession();
  const tempName = 'temp_' + randId();
  const tempTable = tempTableProto.clone(tempName);
  const handleError = (err, ret, w) => {
    if (!err && ret && ret.length) {
      err = new Error(`Unexpected response ${ret.join()}`);
    }
    if (!err) { return; }
    w.abort();
    done(err);
  };
  let error;
  nThen((w) => {
    ch.modify(tempTable.queryString([TEMPORARY]), w((err, ret) => {
      handleError(err, ret, w);
    }));
  }).nThen((w) => {
    ch.insert(tempTable, tempData, w((err) => {
      handleError(err, null, w);
    }));
  }).nThen((w) => {
    doWithTemp(ch, tempTable, w((err) => {
      error = err;
    }));
  }).nThen((w) => {
    ch.modify(`DROP TABLE ${tempTable.name()}`, w((err, ret) => {
      handleError(err, ret, w);
    }));
  }).nThen((_) => {
    done(error);
  });
};

const create = module.exports.create = (
  conf /*:Config_t*/,
  maybeCh /*:ClickHouseInternal_t|void*/
) /*:ClickHouse_t*/ => {
  if (!conf.queryOptions) { conf.queryOptions = ({}/*:Object*/); }
  const ch = maybeCh || new ClickHouse(conf);
  const out = {
    _: ch,
    opts: conf,
    log: Log.create('db'),

    sessionId: () /*:string*/ => {
      if (!conf.sessionId) { throw new Error("no sessionId has been assigned"); }
      return conf.sessionId;
    },
    withSession: (id /*:?string*/) => {
      if (!id && conf.sessionId) { return out; }
      return create(Object.assign({}, conf, { sessionId: id || randId() }), ch);
    },
    withDb: (db /*:string*/) => {
      return create(Object.assign({}, conf, { db: db || randId() }), ch);
    },
    withTempTable: /*::<X>*/(
      tempTable /*:Table_t<X>*/,
      tempData /*:Array<X>*/,
      doWithTemp /*:(ClickHouse_t, Table_t<X>, done:(?Error)=>void)=>void*/,
      done /*:(?Error)=>void*/
    ) => {
      return withTempTable(out, tempTable, tempData, doWithTemp, done);
    },
    mergeUpdate: /*::<X,Y>*/(
      tempTableProto /*:Table_t<X>*/,
      newData /*:Array<X>*/,
      outTable /*:Table_t<Y>*/,
      keyFields /*:Array<Field_t>*/,
      fieldMapper /*:(string, string, Table_t<X>) => string|void*/,
      done /*:(?Error)=>void*/
    ) => {
      return mergeUpdate(out, tempTableProto, newData, outTable, keyFields, fieldMapper, done);
    },
    insert: /*::<X:Object>*/(
      table /*:Table_t<X>*/,
      objects /*:Array<X>*/,
      then /*:(?Error)=>void*/
    ) => {
      return insert(out, table, objects, then);
    },
    query: (
      q /*:string*/,
      then /*:(?Error, ?Array<Object>)=>void*/
    ) => {
      return query(out, true, q, then);
    },
    modify: (
      q /*:string*/,
      then /*:(?Error, ?Array<Object>)=>void*/
    ) => {
      return query(out, false, q, then);
    },
  };
  return out;
};

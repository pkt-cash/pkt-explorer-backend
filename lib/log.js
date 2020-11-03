/*@flow*/
// SPDX-License-Identifier: MIT
'use strict';
const Util = require('util');

const LOG_SPACER_LEN = 110;

const mkSpace = (lineLen) => {
  return new Array(LOG_SPACER_LEN - Math.min(LOG_SPACER_LEN-1,lineLen)).join(' ');
};

const COLORS = Object.freeze({
  reset:      "\x1b[0m",
  bright:     "\x1b[1m",
  dim:        "\x1b[2m",
  underscore: "\x1b[4m",
  blink:      "\x1b[5m",
  reverse:    "\x1b[7m",
  hidden:     "\x1b[8m",

  fgBlack:    "\x1b[30m",
  fgRed:      "\x1b[31m",
  fgGreen:    "\x1b[32m",
  fgYellow:   "\x1b[33m",
  fgBlue:     "\x1b[34m",
  fgMagenta:  "\x1b[35m",
  fgCyan:     "\x1b[36m",
  fgWhite:    "\x1b[37m",

  bgBlack:    "\x1b[40m",
  bgRed:      "\x1b[41m",
  bgGreen:    "\x1b[42m",
  bgYellow:   "\x1b[43m",
  bgBlue:     "\x1b[44m",
  bgMagenta:  "\x1b[45m",
  bgCyan:     "\x1b[46m",
  bgWhite:    "\x1b[47m",
});

const COLOR_BY_LEVEL = Object.freeze({
  DEBUG: "",
  INFO:  COLORS.bright,
  WARN:  COLORS.bright + COLORS.fgYellow,
  ERROR: COLORS.bright + COLORS.fgRed,
});

const log = (mod, level, left0, right) => {
  const left = (typeof(left0) === 'string') ? left0 : Util.inspect(left0);
  const l = `[${mod}] ${level}: ${left}`;
  if (!right) {
    return void console.error(COLOR_BY_LEVEL[level], l, COLORS.reset);
  }
  console.error(COLOR_BY_LEVEL[level], l, mkSpace(l.length), right, COLORS.reset);
};

/*::
export type Log_t = {
  debug: (left: any, right?: string) => void,
  info: (left: any, right?: string) => void,
  warn: (left: any, right?: string) => void,
  error: (left: any, right?: string) => void,
};
*/

module.exports.create = (mod /*:string*/, minLevel /*:string*/) /*:Log_t*/ => {
  const out = {};
  let doLog = false;
  ['debug','info','warn','error'].forEach((l) => {
    if (minLevel === l) { doLog = true; }
    if (doLog) {
      const caps = l.toUpperCase();
      out[l] = (left, right) => log(mod, caps, left, right);
    } else {
      out[l] = (_left, _right) => {};
    }
  });
  return out;
};

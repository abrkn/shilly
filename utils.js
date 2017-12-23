const numeral = require('numeral');
const qr = require('qr-image');
const BigNumber = require('bignumber.js');

exports.formatNumber = (value, format) => numeral(value).format(format);

const printError = (...args) => console.error(...args);
exports.printError = printError;

exports.formatBch = _ => '`' + numeral(_.toString()).format('0,0[.00000000]') + ' BCH`';

exports.formatUsd = _ => {
  if (+_ < 0.01) {
    return '`< $0.01`';
  }

  return '`$' + numeral(_.toString()).format('0,0.00') + '`';
}

exports.swallowError = e => {
  printError(e.stack);
  return 'Error';
};

exports.randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

exports.createQrCode = text =>
  new Promise((resolve, reject) => {
    resolve(qr.imageSync(text));
  });

exports.n = (..._) => new BigNumber(..._);

exports.isValidDiscordUserIdFormat = _ => _.match(/^[0-9]+$/);

exports.parseUserDiscordId = _ => {
  const match = _.match(/^<@!?([0-9]+)>$/);
  if (!match) { return null; }
  return match[1];
};

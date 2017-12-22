const numeral = require('numeral');
const qr = require('qr-image');

exports.formatNumber = (value, format) => numeral(value).format(format);

const printError = (...args) => console.error(...args);
exports.printError = printError;

exports.formatBch = _ => numeral(_).format('0,0.00000000 ') + ' BCH';

exports.swallowError = e => {
  printError(e.stack);
  return 'Error';
};

exports.randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

exports.createQrCode = text =>
  new Promise((resolve, reject) => {
    resolve(qr.imageSync(text));
  });

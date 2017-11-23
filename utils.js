const numeral = require('numeral');

const formatNumber = (value, format) => numeral(value).format(format);

module.exports = { formatNumber };

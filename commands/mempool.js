const numeral = require('numeral');
const { fetchMempool } = require('../apis');
const { swallowError, formatNumber: n } = require('../utils');

module.exports = async ({ say }) => {
  const [cash, core] = await Promise.all([
    fetchMempool('bitcoin-cash').catch(e => swallowError(e)),
    fetchMempool('bitcoin').catch(e => swallowError(e)),
  ]);

  const lines = [
    '**Unconfirmed Transactions**:',
    `Bitcoin Cash: ${isNaN(+cash) ? cash : n(cash, '0,0')}`,
    `Bitcoin Core: ${isNaN(+core) ? core : n(core, '0,0')}`,
  ];

  await say(lines.join('\n'));
};

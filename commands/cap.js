const numeral = require('numeral');
const superagent = require('superagent');
const { fetchCoinmarketcap } = require('../apis');
const createFlipChart = require('../createFlipChart');

module.exports = async ({ say }) => {
  const [cash, core] = await Promise.all([
    fetchCoinmarketcap('bitcoin-cash'),
    fetchCoinmarketcap('bitcoin'),
  ]);

  const chart = await createFlipChart(
    cash.market_cap_usd,
    core.market_cap_usd
  );

  await say({
    file: chart,
  });
};

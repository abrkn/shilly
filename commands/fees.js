const { fetchCoinmarketcap, fetchRecommendedCoreSats } = require('../apis');
const numeral = require('numeral');

module.exports = async ({ say }) => {
  const recommendedCoreSats = await fetchRecommendedCoreSats();
  const btcRate = (await fetchCoinmarketcap('bitcoin')).price_usd;
  const recommended = recommendedCoreSats / 1e8 * btcRate;
  const human = numeral(recommended).format('$0.00 a');

  await say([
    `Recommended Bitcoin Core (BTC) fee: ${human}`,
    `Recommended Bitcoin Cash (BCH) fee: $0.01`,
  ].join('\n'));
};

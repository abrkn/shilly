const { fetchTotalTetherTokens } = require('../apis');
const numeral = require('numeral');

module.exports = async ({ say }) => {
  const total = await fetchTotalTetherTokens();
  const human = numeral(total).format('$0.00a');
  const long = numeral(total).format('$0,0');

  await say(`Bitfinex has issued \`${long}\` (\`${human}\`) in Tether USD`);
};

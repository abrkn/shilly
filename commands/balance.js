const { fetchTotalTetherTokens, fetchCoinmarketcap } = require('../apis');
const { formatBch, n } = require('../utils');
const numeral = require('numeral');

module.exports = async ({ recipient, message, reply, params, tipping, isDm }) => {
  if (!isDm) {
    return;
  }

  const usdRate = (await fetchCoinmarketcap('bitcoin-cash')).price_usd;
  const balance = await tipping.getBalanceForUser(recipient.id);

  const asUsd = numeral(n(balance).mul(usdRate).toString()).format('0,0.000');

  await reply(`Balance: \`${formatBch(balance)}\` (\`$${asUsd}\`)`);
};

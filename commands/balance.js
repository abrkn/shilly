const { fetchTotalTetherTokens, fetchCoinmarketcap } = require('../apis');
const { formatBch, n } = require('../utils');
const numeral = require('numeral');

module.exports = async ({ recipient, message, reply, params, tipping, isDm }) => {
  if (!isDm) {
    return;
  }

  const usdRate = (await fetchCoinmarketcap('bitcoin-cash')).price_usd;

  const confirmedBalance = await tipping.getBalanceForUser(recipient.id);

  const unconfirmedBalance = await tipping.getBalanceForUser(recipient.id, { minConf: 0 });
  const pendingDeposits = n(unconfirmedBalance).sub(confirmedBalance).toNumber();

  const confirmedAsUsd = numeral(n(confirmedBalance).mul(usdRate).toString()).format('0,0.000');

  let depositsText = '';

  if (pendingDeposits > 0) {
    const pendingAsUsd = numeral(n(pendingDeposits).mul(usdRate).toString()).format('0,0.000');
    depositsText = `. Pending deposits: \`${formatBch(pendingDeposits)}\` (\`$${pendingAsUsd}\`)`;
  }

  await reply(`Balance: \`${formatBch(confirmedBalance)}\` (\`$${confirmedAsUsd}\`)${depositsText}`);
};

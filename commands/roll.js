const { fetchTotalTetherTokens, fetchCoinmarketcap, formatBchWithUsd } = require('../apis');
const numeral = require('numeral');
const { n, formatBch } = require('../utils');

module.exports = async ({ client, message, reply, params, tipping, isDm }) => {
  if (params.length !== 1) {
    return;
  }

  const [amountRaw] = params;

  const amountMatch = amountRaw.match(/^(\$?)([0-9\.]+)$/);

  if (!amountMatch) {
    return;
  }

  const [, theirSymbol, theirAmount] = amountMatch;

  let bchAmount;

  const usdRate = (await fetchCoinmarketcap('bitcoin-cash')).price_usd;

  if (theirSymbol === '$') {
    bchAmount = n(theirAmount).div(usdRate).toFixed(8);
  } else {
    bchAmount = theirAmount;
  }

  const amountText = await formatBchWithUsd(bchAmount);

  try {
    const result = await tipping.roll(client.user.id, message.author.id, bchAmount);
    await reply(`... ${result} ${amountText}`);
  } catch (e) {
    await reply(`something crashed: ${e.message}`);
    throw e;
  }
};

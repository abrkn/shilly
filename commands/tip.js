const { fetchTotalTetherTokens, fetchCoinmarketcap } = require('../apis');
const numeral = require('numeral');
const { n, parseUserDiscordId } = require('../utils');

module.exports = async ({ message, reply, params, tipping, isDm }) => {
  if (isDm) {
    return;
  }

  if (params.length !== 2) {
    return;
  }

  const [toUserRaw, amountRaw] = params;
  const toUserId = parseUserDiscordId(toUserRaw);
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

  try {
    const actualAmount = await tipping.transfer(message.member.user.id, toUserId, bchAmount);
    const asUsd = numeral(n(actualAmount).mul(usdRate).toString()).format('0,0.000');

    await reply(`you tipped ${actualAmount} BCH ($${asUsd}) to ${toUserRaw}!`);
  } catch (e) {
    await reply(`something crashed: ${e.message}`);
    throw e;
  }
};

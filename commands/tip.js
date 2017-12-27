const { fetchTotalTetherTokens, fetchCoinmarketcap, formatBchWithUsd } = require('../apis');
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

  if (toUserId === null) {
    console.warn(`${toUserRaw} is not a valid user id`);
    return;
  }

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
    const amountText = await formatBchWithUsd(actualAmount);

    await reply(`you tipped ${amountText} to ${toUserRaw}!`);
  } catch (e) {
    await reply(`something crashed: ${e.message}`);
    throw e;
  }
};

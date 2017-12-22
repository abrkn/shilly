const { fetchTotalTetherTokens } = require('../apis');
const numeral = require('numeral');

module.exports = async ({ message, reply, params, tipping, isDm }) => {
  if (isDm) {
    return;
  }

  if (params.length !== 2) {
    return;
  }

  const [toUserRaw, amountRaw] = params;

  const toUserMatch = toUserRaw.match(/^\<\@[0-9]+\>$/);

  if (!toUserMatch) {
    return;
  }

  const [toUserId] = toUserMatch;

  const amountMatch = amountRaw.match(/^[0-9\.]+$/);

  if (!amountMatch) {
    return;
  }

  const [theirAmount] = amountMatch;

  try {
    const actualAmount = await tipping.transfer(message.member.user.id, toUserId, theirAmount);

    await reply(`you tipped ${actualAmount} BCH to ${toUserRaw}!`);
  } catch (e) {
    await reply(`something crashed: ${e.message}`);
    throw e;
  }
};

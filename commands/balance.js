const { fetchTotalTetherTokens } = require('../apis');
const { formatBch } = require('../utils');
const numeral = require('numeral');

module.exports = async ({ recipient, message, reply, params, tipping, isDm }) => {
  if (!isDm) {
    return;
  }

  const balance = await tipping.getBalanceForUser(recipient.id);
  await reply(`Balance: \`${formatBch(balance)}\``);
};

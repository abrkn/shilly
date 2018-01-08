const { formatBchWithUsd, formatConfirmedAndUnconfirmedBalances } = require('../apis');
const { formatBch, formatUsd, n } = require('../utils');

module.exports = async ({ recipient, message, reply, params, tipping, isDm }) => {
  if (!isDm) {
    await reply('The `!balance` command is only available as a DM. Please try sending the command to me in a direct message.');
    return;
  }

  const confirmed = await tipping.getBalanceForUser(recipient.id);
  const unconfirmed = await tipping.getBalanceForUser(recipient.id, { minConf: 0 });
  const asText = await formatConfirmedAndUnconfirmedBalances(confirmed, unconfirmed);

  await reply(`Balance: ${asText}`);
};

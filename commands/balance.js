const { formatBchWithUsd } = require('../apis');
const { formatBch, formatUsd, n } = require('../utils');

module.exports = async ({ recipient, message, reply, params, tipping, isDm }) => {
  if (!isDm) {
    await reply('This command is only available as a DM.');
    return;
  }

  const confirmedBalance = await tipping.getBalanceForUser(recipient.id);
  const unconfirmedBalance = await tipping.getBalanceForUser(recipient.id, { minConf: 0 });
  const pendingDeposits = n(unconfirmedBalance).sub(confirmedBalance).toNumber();
  const confirmedBalanceText = await formatBchWithUsd(confirmedBalance);

  let depositsText = '';

  if (pendingDeposits > 0) {
    const pendingDepositsText = await formatBchWithUsd(pendingDeposits);
    depositsText = `. Pending deposits: ${pendingDepositsText}`;
  }

  await reply(`Balance: ${confirmedBalanceText}${depositsText}`);
};

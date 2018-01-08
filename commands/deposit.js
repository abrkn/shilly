const { fetchTotalTetherTokens } = require('../apis');
const { formatBch, createQrCode } = require('../utils');
const numeral = require('numeral');

module.exports = async ({ message, reply, params, tipping, isDm }) => {
  if (!isDm) {
    await reply('The `!deposit` command is only available as a DM. Please try sending the command to me in a direct message.');
    return;
  }

  const address = await tipping.getAddressForUser(message.author.id);
  const qr = await createQrCode(`bitcoincash:${address}`);

  await reply(`To deposit Bitcoin Cash (BCH), send to: \`${address}\``);

  await reply({
    file: qr,
  });
};

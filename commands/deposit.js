const { fetchTotalTetherTokens } = require('../apis');
const { formatBch, createQrCode } = require('../utils');
const numeral = require('numeral');

module.exports = async ({ message, reply, params, tipping, isDm }) => {
  if (!isDm) {
    await reply('This command is only available as a DM.');
    return;
  }

  const address = await tipping.getAddressForUser(message.author.id);
  const qr = await createQrCode(`bitcoincash:${address}`);

  await reply(`To deposit Bitcoin Cash (BCH), send to: \`${address}\``);

  await reply({
    file: qr,
  });
};

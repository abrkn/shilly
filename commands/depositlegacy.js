const assert = require('assert');
const { fetchTotalTetherTokens } = require('../apis');
const { formatBch, createQrCode, internalBchAddressToStandard } = require('../utils');
const numeral = require('numeral');

module.exports = async ({ message, reply, params, tipping, isDm }) => {
  if (!isDm) {
    await reply('The `!depositlegacy` command is only available as a DM. Please try sending the command to me in a direct message.');
    return;
  }

  const legacyAddress = await tipping.getAddressForUser(message.author.id);
  assert(legacyAddress.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/));

  const addressWithPrefix = `bitcoincash:${legacyAddress}`;

  const qr = await createQrCode(addressWithPrefix);

  await reply(`To deposit Bitcoin Cash (BCH), send to: \`${addressWithPrefix}\``);

  await reply({
    file: qr,
  });
};

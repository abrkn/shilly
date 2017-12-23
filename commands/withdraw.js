const numeral = require('numeral');
const { n } = require('../utils');
const { fetchCoinmarketcap, formatBchWithUsd } = require('../apis');

module.exports = async ({ message, reply, params, tipping, isDm }) => {
  if (!isDm) {
    return;
  }

  if (params.length !== 2) {
    throw new Error('Invalid number of params');
  }

  const [address, amountRaw] = params;

  if (!address.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/)) {
    throw new Error('Invalid address');
  }

  const amountMatch = amountRaw.match(/^[0-9\.]+$/);

  if (!amountMatch) {
    throw new Error(`Invalid amount: ${amountRaw}`);
  }

  const [theirAmount] = amountMatch;

  const usdRate = (await fetchCoinmarketcap('bitcoin-cash')).price_usd;

  try {
    const { amount: actualAmount, txid } = await tipping.withdraw(message.author.id, address, theirAmount);
    const amountText = await formatBchWithUsd(actualAmount);
    const url = `https://explorer.bitcoin.com/bch/tx/${txid}`;

    await reply(`You withdrew ${amountText} to \`${address}\`! See ${url}`);
  } catch (e) {
    await reply(`something crashed: ${e.message}`);
    throw e;
  }
};

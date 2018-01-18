const assert = require('assert');
const { randomBytes } = require('crypto');
const { formatBchWithUsd, parseBchOrUsdAmount } = require('../apis');
const { n } = require('../utils');

module.exports = async ({
  client,
  message,
  reply,
  params,
  tipping,
  isDm,
  lockBitcoind,
  fetchBitcoinRpc,
}) => {
  const { getBalanceForUser, getUserAccount } = tipping;

  const usage = () => reply('Usage: `!roll 0.0001` (BCH) or `!roll $1.234`');

  if (params.length < 1) {
    return usage();
  }

  const [amountRaw] = params;
  const bchAmount = await parseBchOrUsdAmount(amountRaw);

  if (!bchAmount || bchAmount <= 0) {
    return usage();
  }

  const lock = await lockBitcoind();

  try {
    const prevPlayerBalance = n(await getBalanceForUser(message.author.id));

    if (prevPlayerBalance.lte(bchAmount)) {
      return reply('Roll amount is higher than your balance');
    }

    const prevSelfBalance = n(await getBalanceForUser(client.user.id));

    if (prevSelfBalance.lte(bchAmount)) {
      return reply('House is out of funds. Donate by tipping to Shilly');
    }

    const amountText = await formatBchWithUsd(bchAmount);

    const randomA = randomBytes(32);
    const randomB = randomBytes(32);
    const compared = randomA.compare(randomB);
    const isTie = compared === 0;

    if (isTie) {
      return reply('You tied!');
    }

    const isWinner = compared === 1;

    if (isWinner) {
      const moved = await fetchBitcoinRpc('move', [
        getUserAccount(client.user.id),
        getUserAccount(message.author.id),
        bchAmount,
      ]);
      assert.equal(moved, true, 'Could not move funds');
      return reply(
        `You rolled and :moneybag: **WON** :moneybag: ${amountText}`
      );
    } else {
      const moved = await fetchBitcoinRpc('move', [
        getUserAccount(message.author.id),
        getUserAccount(client.user.id),
        bchAmount,
      ]);
      assert.equal(moved, true, 'Could not move funds');
      return reply(`You rolled and **LOST** ${amountText} :frowning:`);
    }
  } finally {
    await lock.unlock();
  }
};

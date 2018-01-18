const assert = require('assert');
const { randomBytes } = require('crypto');
const {
  n,
  isValidDiscordUserIdFormat,
  bchAddressToInternal,
} = require('./utils');

const MIN_AMOUNT = 0.00001;

const hasTooManyDecimalsForSats = (value, decimals) =>
  !n(n(value).toFixed(8)).eq(n(value));
const getUserAccount = id => `discord-${id}`;

const createTipping = ({ redisClient, say, fetchRpc, lockBitcoind }) => {
  assert(fetchRpc, 'fetchRpc is required');
  assert(lockBitcoind, 'lockBitcoind is required');

  const tipping = async () => {};

  tipping.getUserAccount = getUserAccount;

  tipping.getAddressForUser = async userId => {
    assert(isValidDiscordUserIdFormat(userId));
    return await fetchRpc('getaccountaddress', [getUserAccount(userId)]);
  };

  tipping.getBalanceForAccount = async (accountId, { minConf } = {}) => {
    return await fetchRpc('getbalance', [
      accountId,
      ...(minConf !== undefined ? [minConf] : []),
    ]);
  };

  tipping.getBalanceForUser = async (userId, { minConf } = {}) => {
    assert(isValidDiscordUserIdFormat(userId));

    return tipping.getBalanceForAccount(getUserAccount(userId), { minConf });
  };

  tipping.transfer = async (fromUserId, toUserId, amount) => {
    assert(isValidDiscordUserIdFormat(fromUserId));
    assert(
      isValidDiscordUserIdFormat(toUserId),
      `${toUserId} is an invalid Discord user id`
    );
    assert.equal(typeof toUserId, 'string');
    assert.notEqual(fromUserId, toUserId, 'Cannot send to self');

    const lock = await lockBitcoind();

    try {
      const amountN = n(amount);

      assert(!hasTooManyDecimalsForSats(amountN), 'Too many decimals');
      assert(amountN.isFinite(), 'Not finite');
      assert(amountN.gt(0), 'Less than or equal to zero');

      const prevBalance = n(
        await fetchRpc('getbalance', [getUserAccount(fromUserId)])
      );
      const nextBalance = prevBalance.sub(amountN);
      assert(nextBalance.gte(0), 'Balance would become negative');

      const moved = await fetchRpc('move', [
        getUserAccount(fromUserId),
        getUserAccount(toUserId),
        amountN.toFixed(8),
      ]);
      assert.equal(moved, true, 'Could not move funds');

      return amountN.toFixed(8);
    } finally {
      await lock.unlock();
    }
  };

  tipping.withdraw = async (fromUserId, address, amount) => {
    assert(isValidDiscordUserIdFormat(fromUserId));
    assert.equal(typeof address, 'string');

    const lock = await lockBitcoind();

    try {
      const amountN = n(amount);

      assert(!hasTooManyDecimalsForSats(amountN), 'Too many decimals');
      assert(amountN.isFinite(), 'Not finite');
      assert(amountN.gt(0), 'Less than or equal to zero');
      assert(
        amountN.gte(MIN_AMOUNT),
        `Amount less than minimum  of ${MIN_AMOUNT}`
      );

      const prevBalance = n(
        await fetchRpc('getbalance', [getUserAccount(fromUserId)])
      );
      const nextBalance = prevBalance.sub(amountN);
      assert(nextBalance.gte(0), 'Balance would become negative');

      const txid = await fetchRpc('sendfrom', [
        getUserAccount(fromUserId),
        bchAddressToInternal(address),
        amountN.toFixed(8),
      ]);
      assert(txid, 'Could not withdraw funds');

      return { amount: amountN.toFixed(8), txid };
    } finally {
      await lock.unlock();
    }
  };

  return tipping;
};

module.exports = createTipping;

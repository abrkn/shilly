const assert = require('assert');
const { randomBytes } = require('crypto');
const { parse: parseUrl } = require('url');
const Discord = require('discord.js');
const delay = require('delay');
const superagent = require('superagent');
const numeral = require('numeral');
const { last } = require('lodash');
const debug = require('debug')('shilly:tipping');
const Redlock = require('redlock');
const BigNumber = require('bignumber.js');
const {
  n,
  isValidDiscordUserIdFormat,
  bchAddressToInternal,
} = require('./utils');

const MIN_AMOUNT = 0.00001;

const hasTooManyDecimalsForSats = (value, decimals) =>
  !n(n(value).toFixed(8)).eq(n(value));
const getUserAccount = id => `discord-${id}`;

const { RichEmbed } = Discord;

const redisKey = _ => `shilly.tipping.${_}`;

const createTipping = ({ redisClient, say, bitcoindUrl }) => {
  assert(bitcoindUrl, 'bitcoindUrl is required');

  const redlock = new Redlock([redisClient]);
  const lockBitcoind = () =>
    redlock.lock(`locks.bitcoind.${bitcoindUrl}.lock`, 10e3);

  let fetchRpcCounter = 1;

  const fetchRpc = (method, params) =>
    superagent
      .post(bitcoindUrl)
      .send({ id: (++fetchRpcCounter).toString(), method, params })
      .then(_ => {
        const { result, error } = _.body;
        if (error) {
          throw new Error(error);
        }
        return result;
      });

  const tipping = async () => {};

  tipping.fetchRpc = fetchRpc;

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

  tipping.roll = async (selfUserId, playerUserId, amount) => {
    assert(isValidDiscordUserIdFormat(selfUserId));
    assert(
      isValidDiscordUserIdFormat(playerUserId),
      `${playerUserId} is an invalid Discord user id`
    );
    assert.notEqual(selfUserId, playerUserId, 'Cannot play against self');

    const lock = await lockBitcoind();

    try {
      const amountN = n(amount);

      assert(!hasTooManyDecimalsForSats(amountN), 'Too many decimals');
      assert(amountN.isFinite(), 'Not finite');
      assert(amountN.gt(0), 'Less than or equal to zero');

      const prevSelfBalance = n(
        await fetchRpc('getbalance', [getUserAccount(selfUserId)])
      );
      assert(prevSelfBalance.gte(amountN), 'House is out of funds');

      const prevPlayerBalance = n(
        await fetchRpc('getbalance', [getUserAccount(playerUserId)])
      );
      const nextPlayerBalance = prevPlayerBalance.sub(amountN);
      assert(nextPlayerBalance.gte(0), 'Balance would become negative');

      const randomA = randomBytes(32);
      const randomB = randomBytes(32);
      const compared = randomA.compare(randomB);
      const isTie = compared === 0;

      if (isTie) {
        return 'tied';
      }

      const isWinner = compared === 1;

      if (isWinner) {
        const moved = await fetchRpc('move', [
          getUserAccount(selfUserId),
          getUserAccount(playerUserId),
          amountN.toFixed(8),
        ]);
        assert.equal(moved, true, 'Could not move funds');
        return 'won';
      } else {
        const moved = await fetchRpc('move', [
          getUserAccount(playerUserId),
          getUserAccount(selfUserId),
          amountN.toFixed(8),
        ]);
        assert.equal(moved, true, 'Could not move funds');
        return 'lost';
      }
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

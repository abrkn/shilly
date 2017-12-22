const assert = require('assert');
const { parse: parseUrl } = require('url');
const Discord = require('discord.js');
const delay = require('delay');
const superagent = require('superagent');
const numeral = require('numeral');
const { last } = require('lodash');
const debug = require('debug')('shilly:tipping');
const Redlock = require('redlock');
const BigNumber = require('bignumber.js');
const { n } = require('./utils');

const hasTooManyDecimalsForSats = (value, decimals) => !n(n(value).toFixed(8)).eq(n(value));
const getUserAccount = id => `discord-${id}`;

const { RichEmbed } = Discord;

const redisKey = _ => `shilly.tipping.${_}`;

const createTipping = ({ redisClient, say, bitcoindUrl }) => {
  assert(bitcoindUrl, 'bitcoindUrl is required');

  const redlock = new Redlock([redisClient]);
  const lockBitcoind = () => redlock.lock(`locks.bitcoind.${bitcoindUrl}.lock`, 10e3);

  let fetchRpcCounter = 1;

  const fetchRpc = (method, params) => superagent
    .post(bitcoindUrl)
    .send({ id: (++fetchRpcCounter).toString(), method, params })
    .then(_ => {
      const { result, error } = _.body;
      if (error) { throw new Error(error); }
      return result;
    });

  const tipping = async () => {
  };

  tipping.getAddressForUser = async userId => {
    assert.equal(typeof userId, 'string');
    return await fetchRpc('getaccountaddress', [getUserAccount(userId)]);
  };

  tipping.getBalanceForUser = async userId => {
    assert.equal(typeof userId, 'string');
    return await fetchRpc('getbalance', [getUserAccount(userId)]);
  };

  tipping.transfer = async (fromUserId, toUserId, amount) => {
    assert.equal(typeof fromUserId, 'string');
    assert.equal(typeof toUserId, 'string');
    assert.notEqual(fromUserId, toUserId, 'Cannot send to self');

    const lock = await lockBitcoind();

    try {
      const amountN = n(amount);

      assert(!hasTooManyDecimalsForSats(amountN), 'Too many decimals');
      assert(amountN.isFinite(), 'Not finite');
      assert(amountN.gt(0), 'Less than or equal to zero');

      const prevBalance = n(await fetchRpc('getbalance', [getUserAccount(fromUserId)]));
      const nextBalance = prevBalance.sub(amountN);
      assert(nextBalance.gte(0), 'Balance would become negative');

      const moved = await fetchRpc('move', [`discord-${fromUserId}`, `discord-${toUserId}`, amountN.toFixed(8)]);
      assert.equal(moved, true, 'Could not move funds');

      return amountN.toFixed(8);
    } finally {
      await lock.unlock();
    }
  };

  tipping.withdraw = async (fromUserId, address, amount) => {
    assert.equal(typeof fromUserId, 'string');
    assert.equal(typeof address, 'string');

    const lock = await lockBitcoind();

    try {
      const amountN = n(amount);

      assert(!hasTooManyDecimalsForSats(amountN), 'Too many decimals');
      assert(amountN.isFinite(), 'Not finite');
      assert(amountN.gt(0), 'Less than or equal to zero');

      const prevBalance = n(await fetchRpc('getbalance', [getUserAccount(fromUserId)]));
      const nextBalance = prevBalance.sub(amountN);
      assert(nextBalance.gte(0), 'Balance would become negative');

      const txid = await fetchRpc('sendfrom', [`discord-${fromUserId}`, address, amountN.toFixed(8)]);
      assert(txid, 'Could not withdraw funds');

      return { amount: amountN.toFixed(8), txid, };
    } finally {
      await lock.unlock();
    }
  };

  return tipping;
};

module.exports = createTipping;

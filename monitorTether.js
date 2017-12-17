const Discord = require('discord.js');
const delay = require('delay');
const superagent = require('superagent');
const numeral = require('numeral');
const { last } = require('lodash');
const debug = require('debug')('shilly:monitor-tether');

const { RichEmbed } = Discord;

const BASE_URL = 'http://omniexplorer.info/ask.aspx?api=';
const TICK_INTERVAL = 30e3;

const redisKey = _ => `shilly.monitorTether.${_}`;

const monitorTether = async ({ say, redisClient }) => {
  const tick = async () => {
    const prevHead = await redisClient.getAsync(redisKey('head'));

    const txids = await superagent
      .get(
        `${BASE_URL}getsenderhistory&address=3MbYQMMmSkC3AgWkj9FMo5LsPTW1zBTwXL`
      )
      .retry()
      .then(_ => JSON.parse(_.text).transactions);

    const nextHead = txids[0];

    if (!prevHead) {
      debug(`There is no head. Setting it to ${nextHead}`);
      await redisClient.setAsync(redisKey('head'), nextHead);
      return;
    }

    const newGrants = [];

    for (const txid of txids) {
      if (txid === prevHead) {
        break;
      }

      const tx = await superagent
        .get(`${BASE_URL}gettx&txid=${txid}`)
        .retry()
        .then(_ => JSON.parse(`{${_.text}}`));

      if (tx.type !== 'Grant Property Tokens') {
        continue;
      }

      if (!tx.valid) {
        return;
      }

      newGrants.push({
        txid,
        amount: +tx.amount,
        timestamp: new Date(tx.blocktime * 1e3),
      });
    }

    // Set head to the most txid
    if (prevHead !== nextHead) {
      await redisClient.setAsync(redisKey('head'), nextHead);
    }

    for (const { txid, amount, timestamp } of newGrants) {
      const human = numeral(amount).format('$0.00a');
      const long = numeral(amount).format('$0,0');

      say({
        embed: new RichEmbed({
          title: `Bitfinex just issued another ${long} (${human}) in Tether USD!`,
          url: `http://omniexplorer.info/lookuptx.aspx?txid=${txid}`,
          timestamp,
          description: 'See details in the block explorer',
        }),
      });
    }
  };

  while (true) {
    await tick();
    await delay(TICK_INTERVAL);
  }
};

module.exports = monitorTether;

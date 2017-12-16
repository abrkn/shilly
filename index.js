const assert = require('assert');
const Discord = require('discord.js');
const delay = require('delay');
const superagent = require('superagent');
const numeral = require('numeral');
const Xray = require('x-ray');
const { shuffle } = require('lodash');
const createFlipChart = require('./createFlipChart');
const { formatNumber: n } = require('./utils');
const bluebird = require('bluebird');
const redis = require('redis');
const createQrCode = require('./createQrCode');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const {
  DISCORD_TOKEN,
  PRICE_INTERVAL = 10 * 60e3,
  DISCORD_CHANNEL_ID,
  DISCORD_WELCOME_MESSAGE,
  REDIS_URL = 'redis://localhost',
  RAFFLE_INTERVAL = 24 * 60 * 60e3,
} = process.env;

assert(DISCORD_TOKEN, 'DISCORD_TOKEN');
assert(DISCORD_CHANNEL_ID, 'DISCORD_CHANNEL_ID');
assert(REDIS_URL, 'REDIS_URL');

const redisClient = redis.createClient(REDIS_URL);

const printError = (...args) => console.error(...args);

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const fetchMempool = async coin => {
  const { text } = await superagent(
    `https://api.blockchair.com/${coin}/mempool?u=${+new Date()}`
  );
  const body = JSON.parse(text);
  const [mempool] = body.data.filter(_ => _.e === 'mempool_transactions');
  return +mempool.c;
};

const fetchBchAddressBalance = async address => {
  const { body } = await superagent(
    `https://blockdozer.com/insight-api/addr/${address}/?noTxList=1`
  );
  console.log(body);
  const { balance } = body;
  return balance;
};

const fetchDifficultyAdjustmentEstimate = () =>
  new Promise((resolve, reject) => {
    const x = Xray();

    x(
      'https://bitcoinwisdom.com/bitcoin/difficulty',
      'table:nth-child(2) tr:nth-child(3) td:nth-child(2)'
    )((err, res) => {
      if (err) {
        return reject(err);
      }

      const withoutEscapes = res.replace(/[\n\t]/g, '');
      const withSpace = withoutEscapes.replace(/,/, ', ');
      const lowerCase = withSpace.toLowerCase();

      resolve(lowerCase);
    });
  });

(async () => {
  const client = new Discord.Client();
  client.login(DISCORD_TOKEN);

  // Wait for connect
  await new Promise(resolve => client.on('ready', resolve));

  client.on('guildMemberAdd', member => {
    if (!DISCORD_WELCOME_MESSAGE) {
      return;
    }

    member.send(DISCORD_WELCOME_MESSAGE);
  });

  const channel = client.channels.get(DISCORD_CHANNEL_ID);
  assert(channel, `Channel ${DISCORD_CHANNEL_ID} not found`);

  const fetchCoinmarketcap = async coin => {
    const { body } = await superagent(
      'https://api.coinmarketcap.com/v1/ticker/?limit=10'
    );
    const [item] = body.filter(_ => _.id === coin);
    assert(item, `${coin} not found`);
    return item;
  };

  const getPriceMessage = async coin => {
    const { body } = await superagent(
      'https://api.coinmarketcap.com/v1/ticker/?limit=10'
    );
    const item = await fetchCoinmarketcap(coin);
    const vol24h = numeral(item['24h_volume_usd']).format('0.0a');
    const priceAsBtcText = coin === 'bitcoin' ? '' : ` / ${item.price_btc} BTC`;
    const text = `Price: $${item.price_usd}${priceAsBtcText}; Volume 24h: $${
      vol24h
    }; Change 24h: ${item.percent_change_24h}%`;
    return text;
  };

  const raffle = async () => {
    while (true) {
      const nextRaffle = +(
        (await redisClient.getAsync('shilly.raffle.nextRaffle')) || 0
      );

      if (nextRaffle > +new Date()) {
        await delay(10e3); // Makes updating manually easier
        continue;
      }

      const keyPair = await redisClient.lpopAsync('shilly.raffle.keyPairs');

      if (!keyPair) {
        console.error('There are no more keys in shilly.raffle.keyPairs');
        await delay(10e3); // Makes updating manually easier
        continue;
      }

      await redisClient.lpushAsync('shilly.raffle.keyPairs.used', keyPair);

      const [address, key] = keyPair.split(/,/);
      assert(address && key);

      const members = channel.members
        .array()
        .filter(
          _ =>
            !_.user.bot &&
            channel.guild.presences.get(_.user.id) &&
            channel.guild.presences.get(_.user.id).status == 'online'
        );

      const [member] = shuffle(members);
      assert(member);

      console.log(
        `Raffle drew ${member.user.username} from a list of ${
          members.length
        } candidates`
      );

      // Schedule next raffle
      await await redisClient.setAsync(
        'shilly.raffle.nextRaffle',
        randomIntFromInterval(+new Date(), +new Date() + +RAFFLE_INTERVAL)
      );

      let bchAmount;
      let usdAmount;

      try {
        bchAmount = await fetchBchAddressBalance(address);
      } catch (error) {
        console.error(`Failed to fetch BCH address balance:\n${error.stack}`);
      }

      if (bchAmount !== undefined) {
        try {
          const rate = (await fetchCoinmarketcap('bitcoin-cash')).price_usd;
          usdAmount = (bchAmount * rate).toFixed(2); // TODO: Remove magic number
        } catch (error) {
          console.error(`Failed to fetch USD rate:\n${error.stack}`);
        }
      }

      const amountOrQuestion = _ => (_ === undefined ? '?' : _);

      const explorerUrl = `https://explorer.bitcoin.com/bch/address/${address}`;

      await channel.send(
        `<@${
          member.user.id
        }> has won the random raffle! I've PM'd you instructions.\nThey won: ${amountOrQuestion(
          bchAmount
        )} BCH (${amountOrQuestion(usdAmount)} USD)\n${
          explorerUrl
        }\n\nFor the rest of you, stay logged in the chat and you could be next!`
      );

      await member.send(
        `You have won the random raffle! Scan this QR code in your Bitcoin.com wallet to sweep the Bitcoin Cash:`
      );

      const qr = await createQrCode(key);
      await member.sendFile(
        qr,
        `bitcoin-cash-raffle-winner-${+new Date()}.png`
      );
    }
  };

  client.on('message', message =>
    (async () => {
      const say = (..._) => message.channel.send(_);

      if (message.content === '!price') {
        const [cash, core] = await Promise.all([
          getPriceMessage('bitcoin-cash'),
          getPriceMessage('bitcoin'),
        ]);

        await say(`__Bitcoin Cash__ ${cash}`);
        await say(`Bitcoin Core ${core}`);
      }

      if (message.content === '!help') {
        message.channel.send(
          [
            '!help - This help',
            '!about - About Shilly',
            '!price - Current prices of Bitcoin Cash and Bitcoin core (from https://coinmarketcap.com )',
            '!mempool - Unconfirmed transaction stats (from https://blockchair.com )',
            '!cap - Cash/core market cap comparison (from https://coinmarketcap.com )',
            '!da - Core difficult countdown (from https://bitcoinwisdom.com/bitcoin/difficulty )',
            '!shop - BitcoinCash.baby Shop',
          ].join('\n')
        );
      }

      if (message.content === '!about') {
        const { name, version } = require('./package.json');

        message.channel.send(
          `${name} v${version}. See https://github.com/abrkn/shilly`
        );
      }

      if (message.content === '!shop') {
        message.channel.send(
          'Need a t-shirt to show your love for Bitcoin Cash? Go to http://shop.bitcoincash.baby'
        );
      }

      if (message.content === '!mempool') {
        const [cash, core] = await Promise.all([
          fetchMempool('bitcoin-cash'),
          fetchMempool('bitcoin'),
        ]);

        const text = `**Unconfirmed Transactions**:\nBitcoin Cash: ${n(
          cash,
          '0,0'
        )}\nBitcoin Core: ${n(core, '0,0')}`;

        say(text);
      }

      if (message.content === '!da') {
        const text = await fetchDifficultyAdjustmentEstimate();
        say(`Bitcoin Core will adjust difficulty ${text}`);
      }

      if (message.content === '!cap') {
        const [cash, core] = await Promise.all([
          fetchCoinmarketcap('bitcoin-cash'),
          fetchCoinmarketcap('bitcoin'),
        ]);

        const chart = await createFlipChart(
          cash.market_cap_usd,
          core.market_cap_usd
        );

        await message.channel.sendFile(
          chart,
          `the-cashening-${+new Date()}.png`
        );
      }
    })().catch(printError)
  );

  await Promise.all([raffle()]);
})().then(_ => _);

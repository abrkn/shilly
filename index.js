const assert = require('assert');
const Discord = require('discord.js');
const delay = require('delay');
const superagent = require('superagent');
const numeral = require('numeral');
const createFlipChart = require('./createFlipChart');
const { formatNumber: n } = require('./utils');

const { DISCORD_TOKEN, PRICE_INTERVAL = 10 * 60e3, DISCORD_CHANNEL_ID } = process.env;

assert(DISCORD_TOKEN, 'DISCORD_TOKEN');
assert(DISCORD_CHANNEL_ID, 'DISCORD_CHANNEL_ID');

const printError = (...args) => console.error(...args);


const fetchMempool = async coin => {
  const { text } = await superagent(`https://api.blockchair.com/${coin}/mempool?u=${+new Date()}`);
  const body = JSON.parse(text);
  const [mempool] = body.data.filter(_ => _.e === 'mempool_transactions');
  return +mempool.c;
};

(async () => {
  const client = new Discord.Client();
  client.login(DISCORD_TOKEN);

  // Wait for connect
  await new Promise(resolve => client.on('ready', resolve));

  const channel = client.channels.get(DISCORD_CHANNEL_ID);
  assert(channel, `Channel ${DISCORD_CHANNEL_ID} not found`);

  const fetchCoinmarketcap = async coin => {
    const { body } = await superagent('https://api.coinmarketcap.com/v1/ticker/?limit=10');
    const [item] = body.filter(_ => _.id === coin);
    assert(item, `${coin} not found`);
    return item;
  };

  const getPriceMessage = async coin => {
    const { body } = await superagent('https://api.coinmarketcap.com/v1/ticker/?limit=10');
    const item = await fetchCoinmarketcap(coin);
    const vol24h = numeral(item['24h_volume_usd']).format('0.0a');
    const text = `Price: $${item.price_usd} / ${item.price_btc} BTC; Volume 24h: $${vol24h}; Change 24h: ${item.percent_change_24h}%`;
    return text;
  };

  client.on('message', message => (async () => {
    const say = (..._) => message.channel.send(_);

    if (message.content === '!price') {
      const [cash, core] = await Promise.all([
        getPriceMessage('bitcoin-cash'),
        getPriceMessage('bitcoin'),
      ]);

      await say(`**Bitcoin Cash** ${cash}`);
      await say(`Bitcoin Core ${core}`);
    }

    if (message.content === '!help') {
      message.channel.send('!help !about !price !mempool !flip');
    }

    if (message.content === '!about') {
      const { name, version } = require('./package.json');

      message.channel.send(`${name} v${version}. See https://github.com/abrkn/shilly`);
    }

    if (message.content === '!mempool') {
      const [cash, core] = await Promise.all([
        fetchMempool('bitcoin-cash'),
        fetchMempool('bitcoin'),
      ]);

      const text = `**Unconfirmed Transactions**:\nBitcoin Cash: ${n(cash, '0,0')}\nBitcoin Core: ${n(core, '0,0')}`;

      say(text);
    }

    if (message.content === '!flip') {
      const [cash, core] = await Promise.all([
        fetchCoinmarketcap('bitcoin-cash'),
        fetchCoinmarketcap('bitcoin'),
      ]);

      const ratio = cash.market_cap_usd / core.market_cap_usd;
      const chart = await createFlipChart(ratio);

      await message.channel.sendFile(chart, 'cashening.png');
    }
  })().catch(printError));
})().then(_ => _);

const assert = require('assert');
const Discord = require('discord.js');
const delay = require('delay');
const superagent = require('superagent');
const numeral = require('numeral');

const { DISCORD_TOKEN, PRICE_INTERVAL = 10 * 60e3, DISCORD_CHANNEL_ID } = process.env;

assert(DISCORD_TOKEN, 'DISCORD_TOKEN');
assert(DISCORD_CHANNEL_ID, 'DISCORD_CHANNEL_ID');

const printError = (...args) => console.error(...args);
const n = (value, format) => numeral(value).format(format);

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

  const getPriceMessage = async () => {
    const { body } = await superagent('https://api.coinmarketcap.com/v1/ticker/?limit=10');
    const [item] = body.filter(_ => _.id === 'bitcoin-cash');

    const vol24h = numeral(item['24h_volume_usd']).format('0.0a');

    const text = `${item.name} Price: $${item.price_usd} / ${item.price_btc} BTC; Volume 24h: $${vol24h}; Change 24h: ${item.percent_change_24h}%`;

    return text;
  };

  client.on('message', message => (async () => {
    const say = (..._) => message.channel.send(_);

    if (message.content === '!price') {
      getPriceMessage().then(_ => message.channel.send(_));
    }

    if (message.content === '!help') {
      message.channel.send('!help !price !mempool');
    }

    if (message.content === '!mempool') {
      const [cash, core] = await Promise.all([
        fetchMempool('bitcoin-cash'),
        fetchMempool('bitcoin'),
      ]);

      const text = `**Unconfirmed Transactions**:\nBitcoin Cash: ${n(cash, '0,0')}\nBitcoin Core: ${n(core, '0,0')}`;

      say(text);
    }
  })().catch(printError));
})().then(_ => _);

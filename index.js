const assert = require('assert');
const Discord = require('discord.js');
const delay = require('delay');
const superagent = require('superagent');
const numeral = require('numeral');

const { DISCORD_TOKEN, PRICE_INTERVAL = 10 * 60e3, DISCORD_CHANNEL_ID } = process.env;

assert(DISCORD_TOKEN, 'DISCORD_TOKEN');
assert(DISCORD_CHANNEL_ID, 'DISCORD_CHANNEL_ID');

(async () => {
  const client = new Discord.Client();
  client.login(DISCORD_TOKEN);

  // Wait for connect
  await new Promise(resolve => client.on('ready', resolve));

  const channel = client.channels.get(DISCORD_CHANNEL_ID);
  assert(channel, `Channel ${DISCORD_CHANNEL_ID} not found`);

  while (true) {
    const { body } = await superagent('https://api.coinmarketcap.com/v1/ticker/?limit=10');
    const [item] = body.filter(_ => _.id === 'bitcoin-cash');

    const vol24h = numeral(item['24h_volume_usd']).format('0.0a');

    const text = `${item.name} Price: $${item.price_usd} / ${item.price_btc} BTC; Volume 24h: $${vol24h}; Change 24h: ${item.percent_change_24h}%`;
    await channel.send(text);

    await delay(PRICE_INTERVAL);
  }
})().then(_ => _);

const assert = require('assert');
const superagent = require('superagent');
const Discord = require('discord.js');
const delay = require('delay');
const numeral = require('numeral');
const Xray = require('x-ray');
const { shuffle, isNumber } = require('lodash');
const {
  formatNumber: n,
  printError,
  randomIntFromInterval,
} = require('./utils');
const bluebird = require('bluebird');
const redis = require('redis');
const { RichEmbed } = Discord;
const monitorYours = require('./monitorYours');
const monitorTether = require('./monitorTether');
const createTipping = require('./tipping');
const createRaffle = require('./raffle');
const router = require('./router');
const createWelcome = require('./welcome');
const createBitcoinRpc = require('./bitcoinRpc');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const {
  DISCORD_TOKEN,
  PRICE_INTERVAL = 10 * 60e3,
  DISCORD_CHANNEL_ID,
  REDIS_URL = 'redis://localhost',
  RAFFLE_INTERVAL = 24 * 60 * 60e3,
  DISCORD_YOURS_ORG_CHANNEL_ID,
  BITCOIND_URL,
  COMMAND_PREFIX = '!',
  DISCORD_STAFF_ROLE_ID,
} = process.env;

assert(DISCORD_TOKEN, 'DISCORD_TOKEN');
assert(DISCORD_CHANNEL_ID, 'DISCORD_CHANNEL_ID');
assert(DISCORD_YOURS_ORG_CHANNEL_ID, 'DISCORD_YOURS_ORG_CHANNEL_ID');
assert(REDIS_URL, 'REDIS_URL');
assert(DISCORD_STAFF_ROLE_ID, 'DISCORD_STAFF_ROLE_ID');

const redisClient = redis.createClient(REDIS_URL);

(async () => {
  const client = new Discord.Client();
  client.login(DISCORD_TOKEN);

  console.log('Waiting for Discord to connect...');

  // Wait for connect
  await new Promise(resolve => client.on('ready', resolve));

  console.log('Discord connected');

  const { fetchRpc, lockBitcoind } = createBitcoinRpc({
    redisClient,
    bitcoindUrl: BITCOIND_URL,
  });

  const tipping = createTipping({
    say: _ => channel.send(_),
    fetchRpc,
    lockBitcoind,
  });

  const welcome = createWelcome({ client });

  const channel = client.channels.get(DISCORD_CHANNEL_ID);
  assert(channel, `Channel ${DISCORD_CHANNEL_ID} not found`);

  const raffle = createRaffle({
    interval: +RAFFLE_INTERVAL,
    redisClient,
    fetchBitcoinRpc: fetchRpc,
    say: _ => channel.send(_),
    client,
    tipping,
    channel,
  });

  const yoursChannel = client.channels.get(DISCORD_YOURS_ORG_CHANNEL_ID);
  assert(yoursChannel, `Channel ${DISCORD_YOURS_ORG_CHANNEL_ID} not found`);

  client.on('message', message =>
    (async () => {
      // Cheap fix to not react to own messages
      if (message.author.bot) {
        return;
      }

      console.log(message.content);

      const words = message.content.split(/ /g).filter(_ => _);
      const [firstWord, ...otherWords] = words;

      if (!firstWord) {
        return;
      }

      const commandMatch = firstWord
        .toLowerCase()
        .match(`^${COMMAND_PREFIX}([a-z0-9]+)$`);

      if (!commandMatch) {
        return;
      }

      const [, command] = commandMatch;

      await router.handle({
        command,
        params: otherWords,
        message,
        reply: message.reply.bind(message),
        say: message.channel.send.bind(message.channel),
        tipping,
        isDm: message.channel.type === 'dm',
        recipient: message.channel.recipient,
        client,
        guild: channel.guild,
        authorIsStaff: !!channel.guild.members
          .get(message.author.id)
          .roles.get(DISCORD_STAFF_ROLE_ID),
        fetchBitcoinRpc: fetchRpc,
        lockBitcoind,
      });
    })().catch(printError)
  );

  await Promise.all([
    raffle(),
    monitorYours({ redisClient, say: _ => yoursChannel.send(_) }),
    monitorTether({ redisClient, say: _ => channel.send(_) }),
    tipping(),
    welcome(),
  ]);
})().then(_ => _);

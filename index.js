const assert = require('assert');
const superagent = require('superagent');
const Discord = require('discord.js');
const delay = require('delay');
const numeral = require('numeral');
const Xray = require('x-ray');
const { shuffle, isNumber } = require('lodash');
const { formatNumber: n, printError } = require('./utils');
const bluebird = require('bluebird');
const redis = require('redis');
const { RichEmbed } = Discord;
const monitorYours = require('./monitorYours');
const monitorTether = require('./monitorTether');
const createTipping = require('./tipping');
const router = require('./router');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const {
  DISCORD_TOKEN,
  PRICE_INTERVAL = 10 * 60e3,
  DISCORD_CHANNEL_ID,
  DISCORD_WELCOME_MESSAGE,
  REDIS_URL = 'redis://localhost',
  RAFFLE_INTERVAL = 24 * 60 * 60e3,
  DISCORD_YOURS_ORG_CHANNEL_ID,
  BITCOIND_URL,
  COMMAND_PREFIX = '!',
} = process.env;

assert(DISCORD_TOKEN, 'DISCORD_TOKEN');
assert(DISCORD_CHANNEL_ID, 'DISCORD_CHANNEL_ID');
assert(DISCORD_YOURS_ORG_CHANNEL_ID, 'DISCORD_YOURS_ORG_CHANNEL_ID');
assert(REDIS_URL, 'REDIS_URL');

const redisClient = redis.createClient(REDIS_URL);

(async () => {
  const client = new Discord.Client();
  client.login(DISCORD_TOKEN);

  // Wait for connect
  await new Promise(resolve => client.on('ready', resolve));

  const tipping = createTipping({ redisClient, say: _ => channel.send(_), bitcoindUrl: BITCOIND_URL });

  client.on('guildMemberAdd', member => {
    if (!DISCORD_WELCOME_MESSAGE) {
      return;
    }

    member.send(DISCORD_WELCOME_MESSAGE);
  });

  const channel = client.channels.get(DISCORD_CHANNEL_ID);
  assert(channel, `Channel ${DISCORD_CHANNEL_ID} not found`);

  const yoursChannel = client.channels.get(DISCORD_YOURS_ORG_CHANNEL_ID);
  assert(yoursChannel, `Channel ${DISCORD_YOURS_ORG_CHANNEL_ID} not found`);

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

      const lines = [
        `<@${
        member.user.id
        }> has won the random raffle! I've PM'd you instructions.`,
        `They won: ${amountOrQuestion(bchAmount)} BCH (${amountOrQuestion(
          usdAmount
        )} USD)`,
        `${explorerUrl}`,
        `For the rest of you, stay logged in the chat and you could be next or use the faucet at https://learnbitcoin.cash/faucet`,
      ];

      await channel.send(lines.join('\n'));

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
      if (message.member.bot) {
        return;
      }

      console.log(message.content);

      const words = message.content.split(/ /g).filter(_ => _);
      const [firstWord, ...otherWords] = words;

      if (!firstWord) {
        return;
      }

      const commandMatch = firstWord.toLowerCase().match(`^${COMMAND_PREFIX}([a-z0-9]+)$`);

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
      });
    })().catch(printError)
  );

  await Promise.all([
    raffle(),
    monitorYours({ redisClient, say: _ => yoursChannel.send(_) }),
    monitorTether({ redisClient, say: _ => channel.send(_) }),
    tipping(),
  ]);
})().then(_ => _);

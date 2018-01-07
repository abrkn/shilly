const assert = require('assert');
const delay = require('delay');
const { rnorm } = require('randgen');
const { shuffle } = require('lodash');
const { randomIntFromInterval } = require('./utils');
const { formatBchWithUsd } = require('./apis');

const ESTIMATED_BCH_PRICE = 3000;

const getRaffleBchAmount = () =>
  +((Math.abs(rnorm(5, 5)) / ESTIMATED_BCH_PRICE).toFixed(8));

const createRaffle = ({
  fetchBitcoinRpc,
  interval,
  redisClient,
  say,
  client,
  tipping,
  channel,
}) => {
  const tick = async () => {
    const nextRaffle = +(
      (await redisClient.getAsync('shilly.raffle.nextRaffle')) || 0
    );

    if (nextRaffle > +new Date()) {
      await delay(10e3); // Makes updating manually easier
      return;
    }

    const botBalance = await tipping.getBalanceForUser(client.user.id);
    const bchAmount = getRaffleBchAmount();

    if (botBalance < bchAmount) {
      console.warn(`Cannot afford to raffle. Random amount: ${bchAmount}; Bot balance: ${botBalance}`);
      return;
    }

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
      randomIntFromInterval(+new Date(), +new Date() + interval)
    );

    const actualBchAmount = await tipping.transfer(client.user.id, member.user.id, bchAmount);
    const amountText = await formatBchWithUsd(actualBchAmount);

    const lines = [
      `<@${
      member.user.id
      }> has won the random raffle! I've DM'd you instructions.`,
      `They won: ${amountText}`,
      `For the rest of you, stay logged into the chat and you could be next!`,
    ];

    await channel.send(lines.join('\n'));

    await member.send([
      `You have won the random raffle of ${amountText}!`,
      `DM me \`!balance\` or \`!help\` for more information`,
    ].join('\n'));

    await delay(10e3); // Makes updating manually easier
  };

  const raffle = async () => {
    while (true) {
      await tick();
    };
  };

  return raffle;
};

module.exports = createRaffle;

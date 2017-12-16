const Discord = require('discord.js');
const delay = require('delay');
const superagent = require('superagent');
const { defaultTo, last } = require('lodash');

const { RichEmbed } = Discord;

const BASE_URL = 'https://www.yours.org/';
const TICK_INTERVAL = 30e3;

const redisKey = _ => `shilly.monitorYours.${_}`;

const monitorYours = async ({ say, redisClient }) => {
  const tick = async () => {
    const head = new Date(
      defaultTo(await redisClient.getAsync(redisKey('head')), new Date())
    );

    const { body: posts } = await superagent
      .get(`${BASE_URL}api/contents/home/crypto/new/1`)
      .retry();

    const newPosts = posts.filter(_ => new Date(_.createdAt) > head).reverse();

    for (const post of newPosts) {
      const embed = new RichEmbed({
        title: post.title,
        thumbnail: post.thumbnailUrl && { url: post.thumbnailUrl },
        url: `${BASE_URL}content/${post.titleUrlString}/`,
        timestamp: new Date(post.createdAt),
        description: 'Read more on yours.org',
      });

      await say({ embed });
    }

    if (newPosts.length) {
      // Set head to the most recent post
      await redisClient.setAsync(redisKey('head'), last(newPosts).createdAt);
    }
  };

  while (true) {
    await tick();
    await delay(TICK_INTERVAL);
  }
};

module.exports = monitorYours;

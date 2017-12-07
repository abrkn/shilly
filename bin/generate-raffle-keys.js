#!/usr/bin/env node -r panik
// Generate new raffle payment addresses and redis push format
// Usage cat keys.txt | bin/generate-raffle-keys.js
// where keys.txt contains the output of the bulk wallet paper wallet creator
// found at https://walletgenerator.net/?currency=BitcoinCash

const getStdin = require('get-stdin');
const assert = require('assert');
const { rnorm } = require('randgen');

const ESTIMATED_BCH_PRICE = 1500;

const getRaffleBchAmount = () =>
  (Math.abs(rnorm(5, 5)) / ESTIMATED_BCH_PRICE).toFixed(8);

(async () => {
  const stdin = await getStdin();
  assert(stdin, 'stdin should contain output from bulk paper wallet generator');

  const lines = stdin.split(/\r?\n/g).filter(_ => _.length);
  const pairs = lines
    .map(_ =>
      _.replace(/"/g, '')
        .split(/,/g)
        .slice(1)
    )
    .map(([address, key]) => ({ address, key }));
  const pairsWithAmounts = pairs.map(_ => ({
    ..._,
    amount: getRaffleBchAmount(),
  }));

  for (const _ of pairsWithAmounts) {
    const qr = `bitcoincash:${_.address}?amount=${_.amount}`;
    const qrEncoded = encodeURIComponent(qr);

    console.log(
      `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${
        qrEncoded
      }&choe=UTF-8`
    );
  }

  const redisItems = pairsWithAmounts
    .map(_ => [_.address, _.key].join(','))
    .join(' ');
  const redisCommand = `LPUSH shilly.raffle.keyPairs ${redisItems}`;

  console.log(redisCommand);
})().then(process.exit);

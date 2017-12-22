const numeral = require('numeral');
const superagent = require('superagent');
const { fetchCoinmarketcap } = require('../apis');

const getPriceMessage = async coin => {
  const { body } = await superagent(
    'https://api.coinmarketcap.com/v1/ticker/?limit=10'
  );
  const item = await fetchCoinmarketcap(coin);
  const vol24h = numeral(item['24h_volume_usd']).format('0.0a');
  const priceAsBtcText = coin === 'bitcoin' ? '' : ` / ${item.price_btc} BTC`;
  const text = `Price: $${
    item.price_usd
    }${priceAsBtcText}; Volume 24h: $${vol24h}; Change 24h: ${
    item.percent_change_24h
    }%`;
  return text;
};

module.exports = async ({ say }) => {
  const [cash, core] = await Promise.all([
    getPriceMessage('bitcoin-cash'),
    getPriceMessage('bitcoin'),
  ]);

  await say(`__Bitcoin Cash__ ${cash}`);
  await say(`Bitcoin Core ${core}`);
};

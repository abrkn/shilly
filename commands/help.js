module.exports = async ({ say }) => {
  await say(
    [
      '!help - This help',
      '!about - About Shilly',
      '!price - Current prices of Bitcoin Cash and Bitcoin core (from https://coinmarketcap.com )',
      '!mempool - Unconfirmed transaction stats (from https://blockchair.com )',
      '!cap - Cash/core market cap comparison (from https://coinmarketcap.com )',
      '!tether - Amount of Tether USD issued (from https://omniexplorer.info/lookupsp.aspx?sp=31 )',
      '!fees - Recommended fees (from https://bitcoinfees.earn.com/ )',
      '',
      '--- Tipping (ALPHA. Loss of funds may occur) ---',
      '!balance - See tipping balance (DM only)',
      '!deposit - See tipping deposit address (DM only)',
      '!tip <recipient> <amount of BCH> - Channel only. Amount MUST BE in BCH, not USD',
      '',
      '!shop - BitcoinCash.baby Shop',
    ].join('\n')
  );
};

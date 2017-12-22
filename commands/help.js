module.exports = async ({ say }) => {
  await say(
    [
      '`!help` - This help',
      '`!about` - About Shilly',
      '`!price` - Current prices of Bitcoin Cash and Bitcoin core (from https://coinmarketcap.com )',
      '`!mempool` - Unconfirmed transaction stats (from https://blockchair.com )',
      '`!cap` - Cash/core market cap comparison (from https://coinmarketcap.com )',
      '`!tether` - Amount of Tether USD issued (from https://omniexplorer.info/lookupsp.aspx?sp=31 )',
      '`!fees` - Recommended fees (from https://bitcoinfees.earn.com/ )',
      '',
      '--- Tipping (ALPHA. Loss of funds may occur) ---',
      '`!balance` - See tipping balance (DM only)',
      '`!deposit` - See tipping deposit address (DM only)',
      '`!tip <recipient> <amount of BCH>` or `!tip <recipient> $<amount of USD>` - Channel only',
      '`!withdraw <address> <amount of BCH>` - DM only',
      '',
      '`!shop` - Bitcoin Cash Community Shop',
    ].join('\n')
  );
};

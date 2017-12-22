module.exports = async ({ say }) => {
  const { name, version } = require('../package.json');

  await say(
    `${name} v${version}. See https://github.com/abrkn/shilly`
  );
};

const commands = require('./commands');

exports.handle = async options => {
  const { command, ...rest } = options;
  const handler = commands[command];

  if (!handler) {
    return;
  }

  return await handler(options);
};

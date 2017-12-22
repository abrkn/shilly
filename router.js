const commands = require('./commands');

exports.handle = async options => {
  const { command, ...rest } = options;
  const handler = commands[command];
  console.log({ command, handler });

  if (!handler) {
    return;
  }

  return await handler(options);
};

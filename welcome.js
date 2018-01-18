const { readFileSync } = require('fs');
const { join: joinPath } = require('path');

const message = readFileSync(
  joinPath(__dirname, 'templates/welcome.tpl'),
  'utf8'
);

const createWelcome = ({ client }) => {
  const welcome = async () => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    client.on('guildMemberAdd', member => {
      console.log(
        `Sending welcome message to new member, ${member.user.username}`
      );
      member.send(message).catch(error =>
        setImmediate(() => {
          throw error;
        })
      );
    });
  };

  return welcome;
};

module.exports = createWelcome;

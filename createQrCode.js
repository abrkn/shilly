const qr = require('qr-image');

const createQrCode = text => new Promise((resolve, reject) => {
  resolve(qr.imageSync(text));
});

module.exports = createQrCode;

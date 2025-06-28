const config = require('../config/config');
const logger = require('../config/logger');
const crypto = require('crypto');

// Encryption function in Node.js
function encrypt(text, key) {
  try {
    const iv = crypto.randomBytes(16); // generate a random initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(config.encryption.cnicKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Combine the IV and encrypted text and return
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error(`Encryption error: ${error.message}`, { text, key });
    return ''; // Return empty string on error instead of throwing
  }
}

module.exports = {
  encrypt,
};

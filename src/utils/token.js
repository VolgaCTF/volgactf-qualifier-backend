const crypto = require('crypto')
const base64url = require('base64url')

module.exports = {
  generate: function (size = 64) {
    return crypto.randomBytes(size)
  },

  encode: function (buf) {
    return base64url(buf)
  },

  decode: function (encoded) {
    return base64url.toBuffer(encoded)
  },

  decodeString: function (encoded) {
    return base64url.decode(encoded)
  }
}

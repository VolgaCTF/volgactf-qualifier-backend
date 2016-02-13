import crypto from 'crypto'
import base64url from 'base64url'

export default {
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

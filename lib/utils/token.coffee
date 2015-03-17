crypto = require 'crypto'
base64url = require 'base64url'

module.exports =
    generate:  (size = 64) ->
        crypto.randomBytes size

    encode: (buf) ->
        base64url buf

    decode: (encoded) ->
        base64url.toBuffer encoded

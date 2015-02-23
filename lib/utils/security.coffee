bcrypt = require 'bcrypt'


module.exports.getPasswordHash = (password, callback) ->
    bcrypt.hash password, 10, (err, hash) ->
        if err?
            callback err, null
        else
            callback null, hash

module.exports.checkPassword = (password, hash, callback) ->
    bcrypt.compare password, hash, (err, res) ->
        if err?
            callback err, null
        else
            callback null, res

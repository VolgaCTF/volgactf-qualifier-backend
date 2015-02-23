bcrypt = require 'bcrypt'


getPasswordHashSalt = (password, callback) ->
    bcrypt.genSalt 10, (err, salt) ->
        if err?
            callback err, null, null
        else
            bcrypt.hash password, salt, (err, hash) ->
                if err?
                    callback err, null, null
                else
                    callback null, hash, salt

module.exports.getPasswordHashSalt = getPasswordHashSalt

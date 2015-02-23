Supervisor = require '../models/supervisor'
security = require '../utils/security'


class SupervisorController
    @create: (options, callback) ->
        supervisor = Supervisor.findOne username: options.username, (err, supervisor) ->
            if supervisor?
                callback 'Supervisor exists!', null
            else
                security.getPasswordHashSalt options.password, (err, hash, salt) ->
                    if err?
                        callback err, null
                    else
                        supervisor = new Supervisor
                            username: options.username
                            passwordHash: hash
                            passwordSalt: salt
                            rights: options.rights
                        supervisor.save (err, supervisor) ->
                            if err?
                                callback err, null
                            else
                                callback null, supervisor

    @remove: (username, callback) ->
        supervisor = Supervisor.remove username: username, (err) ->
            if err?
                callback 'Supervisor does not exist!'
            else
                callback null


module.exports = SupervisorController

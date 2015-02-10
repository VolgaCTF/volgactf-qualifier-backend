Team = require '../models/team'
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


class TeamController
    @new: (options, callback) ->
        team = Team.findOne name: options.team, (err, team) ->
            if team?
                callback "Team exists!", null
            else
                console.log "Team does not exist!"
                getPasswordHashSalt options.password, (err, hash, salt) ->
                    if err?
                        callback err, null
                    else
                        team = new Team
                            name: options.team
                            email: options.email
                            passwordHash: hash
                            passwordSalt: salt
                            country: options.country
                            locality: options.locality
                            institution: options.institution
                        team.save (err, team) ->
                            if err?
                                callback err, null
                            else
                                callback null, team


module.exports = TeamController

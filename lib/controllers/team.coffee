Team = require '../models/team'
security = require '../utils/security'


class TeamController
    @new: (options, callback) ->
        team = Team.findOne name: options.team, (err, team) ->
            if team?
                callback "Team exists!", null
            else
                console.log "Team does not exist!"
                security.getPasswordHashSalt options.password, (err, hash, salt) ->
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

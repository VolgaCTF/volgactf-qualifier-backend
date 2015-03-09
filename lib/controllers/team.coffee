Team = require '../models/team'
security = require '../utils/security'


class TeamController
    @new: (options, callback) ->
        team = Team.findOne name: options.team, (err, team) ->
            if team?
                callback "Team exists!", null
            else
                console.log "Team does not exist!"
                security.getPasswordHash options.password, (err, hash) ->
                    if err?
                        callback err, null
                    else
                        team = new Team
                            name: options.team
                            email: options.email
                            passwordHash: hash
                            country: options.country
                            locality: options.locality
                            institution: options.institution
                        team.save (err, team) ->
                            if err?
                                callback err, null
                            else
                                callback null, team

    @signin: (name, password, callback) ->
        Team.findOne name: name, (err, team) ->
            if team?
                security.checkPassword password, team.passwordHash, (err, res) ->
                    if err?
                        callback err, null
                    else
                        if res
                            callback null, team
                        else
                            callback null, null
            else
                callback 'Team does not exist!', null

    @list: (callback) ->
        Team.find (err, teams) ->
            if err?
                callback err, null
            else
                callback null, teams

module.exports = TeamController

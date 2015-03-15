Team = require '../models/team'
security = require '../utils/security'
fs = require 'fs'
path = require 'path'
gm = require 'gm'
queue = require '../utils/queue'


class TeamController
    @create: (options, callback) ->
        Team.find().or([ {name: options.team}, {email: options.email} ]).count (err, count) ->
            if count > 0
                callback 'Specified credentials (team name or email) have been already used!', null
            else
                security.getPasswordHash options.password, (err, hash) ->
                    if err?
                        callback 'Internal error! Please try again later.', null
                    else
                        team = new Team
                            name: options.team
                            email: options.email
                            emailConfirmed: no
                            passwordHash: hash
                            country: options.country
                            locality: options.locality
                            institution: options.institution
                        team.save (err, team) ->
                            if err?
                                callback 'Internal error! Please try again later', null
                            else
                                if options.logoFilename?
                                    createLogoQueue = queue 'createLogoQueue'
                                    createLogoQueue.add id: team._id, filename: options.logoFilename

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

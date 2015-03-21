Team = require '../models/team'
security = require '../utils/security'
fs = require 'fs'
path = require 'path'
gm = require 'gm'
queue = require '../utils/queue'
token = require '../utils/token'
logger = require '../utils/logger'


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
                            createdAt: new Date()
                            emailConfirmed: no
                            emailConfirmationToken: token.generate()
                            passwordHash: hash
                            country: options.country
                            locality: options.locality
                            institution: options.institution
                        team.save (err, team) ->
                            if err?
                                callback 'Internal error! Please try again later', null
                            else
                                if options.logoFilename?
                                    queue('createLogoQueue').add
                                        id: team._id
                                        filename: options.logoFilename

                                queue('sendEmailQueue').add
                                    name: team.name
                                    email: team.email
                                    token: team.emailConfirmationToken

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

    @verifyEmail: (encodedEmail, encodedToken, callback) ->
        try
            email = token.decodeString encodedEmail
            token = token.decode encodedToken
        catch e
            logger.error e
            callback 'Invalid verification URL!'
            return

        params = email: email, emailConfirmationToken: token
        Team.findOne params, (err, team) ->
            if team?
                team.emailConfirmed = yes
                team.emailConfirmationToken = null
                team.save (err, team) ->
                    if err?
                        callback 'Internal error! Please try again later'
                    else
                        callback null
            else
                callback 'Invalid verification URL!'


module.exports = TeamController

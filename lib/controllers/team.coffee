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
        Team.find().or([ {name: options.team}, {email: options.email.toLowerCase()} ]).count (err, count) ->
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

    @resendConfirmationEmail: (id, callback) ->
        Team.findOne _id: id, (err, team) ->
            if team?
                if team.emailConfirmed
                    callback 'Email already confirmed!', null
                else
                    team.emailConfirmationToken = token.generate()
                    team.save (err, team) ->
                        if err?
                            callback 'Internal error! Please try again later', null
                        else
                            queue('sendEmailQueue').add
                                name: team.name
                                email: team.email
                                token: team.emailConfirmationToken

                            callback null, yes
            else
                callback 'Team does not exist!', null

    @changeEmail: (id, email, callback) ->
        Team.findOne _id: id, (err, team) ->
            if team?
                if team.emailConfirmed
                    callback 'Email already confirmed!', null
                else
                    Team.find(email: email.toLowerCase()).count (err, count) ->
                        if err?
                            callback 'Internal error! Please try again later', null
                        else
                            if count > 0
                                callback 'Email has already been used!', null
                            else
                                team.email = email
                                team.emailConfirmationToken = token.generate()
                                team.save (err, team) ->
                                    if err?
                                        callback 'Internal error! Please try again later', null
                                    else
                                        queue('sendEmailQueue').add
                                            name: team.name
                                            email: team.email
                                            token: team.emailConfirmationToken

                                        callback null, yes
            else
                callback 'Team does not exist!', null

    @editProfile: (id, country, locality, institution, callback) ->
        Team.findOne _id: id, (err, team) ->
            if team?
                team.country = country
                team.locality = locality
                team.institution = institution
                team.save (err, team) ->
                    if err?
                        callback 'Internal error! Please try again later.', null
                    else
                        callback null, yes
            else
                callback 'Team does not exist!', null

    @changePassword: (id, currentPassword, newPassword, callback) ->
        Team.findOne _id: id, (err, team) ->
            if team?
                security.checkPassword currentPassword, team.passwordHash, (err, res) ->
                    if err?
                        callback 'Invalid password!', null
                    else
                        if res
                            security.getPasswordHash newPassword, (err, hash) ->
                                if err?
                                    callback 'Internal error! Please try again later.', null
                                else
                                    team.passwordHash = hash
                                    team.save (err, team) ->
                                        if err?
                                            callback 'Internal error! Please try again later.', null
                                        else
                                            callback null, yes
                        else
                            callback 'Invalid password!', null
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
            code = token.decode encodedToken
        catch e
            logger.error e
            callback 'Invalid verification URL!'
            return

        params = email: email, emailConfirmationToken: code
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

    @get: (id, callback) ->
        Team.findOne _id: id, (err, team) ->
            if err?
                callback 'Team not found!', null
            else
                callback null, team

module.exports = TeamController

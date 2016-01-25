Team = require '../models/team'
security = require '../utils/security'
fs = require 'fs'
path = require 'path'
gm = require 'gm'
queue = require '../utils/queue'
token = require '../utils/token'
logger = require '../utils/logger'
errors = require '../utils/errors'
publisher = require '../utils/publisher'
BaseEvent = require('../utils/events').BaseEvent

teamSerializer = require '../serializers/team'


class UpdateTeamProfileEvent extends BaseEvent
    constructor: (team) ->
        super 'updateTeamProfile'
        publicData = teamSerializer team
        @data.guests = publicData
        @data.teams = publicData

        @data.supervisors = teamSerializer team, exposeEmail: yes


class QualifyTeamEvent extends BaseEvent
    constructor: (team) ->
        super 'qualifyTeam'
        publicData = teamSerializer team
        @data.guests = publicData
        @data.teams = publicData

        @data.supervisors = teamSerializer team, exposeEmail: yes


class CreateTeamEvent extends BaseEvent
    constructor: (team) ->
        super 'createTeam'
        @data.supervisors = teamSerializer team, exposeEmail: yes


class ChangeTeamEmailEvent extends BaseEvent
    constructor: (team) ->
        super 'changeTeamEmail'
        @data.supervisors = teamSerializer team, exposeEmail: yes


class TeamController
    @restore: (email, callback) ->
        Team.findOne email: email.toLowerCase(), (err, team) ->
            if err?
                logger.error err
                callback new errors.InternalError()
            else
                if team?
                    team.resetPasswordToken = token.generate()
                    team.save (err, team) ->
                        if err?
                            logger.error err
                            callback new errors.InternalError()
                        else
                            queue('sendEmailQueue').add
                                message: 'restore'
                                name: team.name
                                email: team.email
                                token: team.resetPasswordToken

                            callback null
                else
                    callback new errors.TeamNotFoundError()

    @create: (options, callback) ->
        Team.find().or([ {name: options.team}, {email: options.email.toLowerCase()} ]).count (err, count) ->
            if err?
                logger.error err
                callback err
            else
                if count > 0
                    callback new errors.TeamCredentialsTakenError()
                else
                    security.getPasswordHash options.password, (err, hash) ->
                        if err?
                            logger.error err
                            callback new errors.InternalError()
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
                                disqualified: no
                                resetPasswordToken: null
                            team.save (err, team) ->
                                if err?
                                    logger.error err
                                    callback new errors.InternalError()
                                else
                                    if options.logoFilename?
                                        queue('createLogoQueue').add
                                            id: team._id
                                            filename: options.logoFilename

                                    queue('sendEmailQueue').add
                                        message: 'welcome'
                                        name: team.name
                                        email: team.email
                                        token: team.emailConfirmationToken

                                    callback null
                                    publisher.publish 'realtime', new CreateTeamEvent team

    @signin: (name, password, callback) ->
        Team.findOne name: name, (err, team) ->
            if err?
                logger.error err
                callback new errors.InvalidTeamCredentialsError(), null
            else
                if team?
                    security.checkPassword password, team.passwordHash, (err, res) ->
                        if err?
                            logger.error err
                            callback new errors.InternalError(), null
                        else
                            if res
                                callback null, team
                            else
                                callback new errors.InvalidTeamCredentialsError(), null
                else
                    callback new errors.InvalidTeamCredentialsError(), null

    @resendConfirmationEmail: (id, callback) ->
        TeamController.get id, (err, team) ->
            if err?
                callback err
            else
                if team.emailConfirmed
                    callback new errors.EmailConfirmedError()
                else
                    team.emailConfirmationToken = token.generate()
                    team.save (err, team) ->
                        if err?
                            logger.error err
                            callback new errors.InternalError()
                        else
                            queue('sendEmailQueue').add
                                message: 'welcome'
                                name: team.name
                                email: team.email
                                token: team.emailConfirmationToken

                            callback null

    @changeEmail: (id, email, callback) ->
        TeamController.get id, (err, team) ->
            if err?
                callback err
            else
                if team.emailConfirmed
                    callback new errors.EmailConfirmedError()
                else
                    Team.find(email: email.toLowerCase()).count (err, count) ->
                        if err?
                            logger.error err
                            callback new errors.InternalError()
                        else
                            if count > 0
                                callback new errors.EmailTakenError()
                            else
                                team.email = email
                                team.emailConfirmationToken = token.generate()
                                team.save (err, team) ->
                                    if err?
                                        logger.error err
                                        callback new errors.InternalError()
                                    else
                                        queue('sendEmailQueue').add
                                            message: 'welcome'
                                            name: team.name
                                            email: team.email
                                            token: team.emailConfirmationToken

                                        callback null
                                        publisher.publish 'realtime', new ChangeTeamEmailEvent team

    @editProfile: (id, country, locality, institution, callback) ->
        TeamController.get id, (err, team) ->
            if err?
                callback err
            else
                team.country = country
                team.locality = locality
                team.institution = institution
                team.save (err, team) ->
                    if err?
                        logger.error err
                        callback new errors.InternalError()
                    else
                        callback null
                        publisher.publish 'realtime', new UpdateTeamProfileEvent team

    @changeLogo: (id, logoFilename, callback) ->
        TeamController.get id, (err, team) ->
            if err?
                callback err
            else
                queue('createLogoQueue').add
                    id: team._id
                    filename: logoFilename
                callback null

    @changePassword: (id, currentPassword, newPassword, callback) ->
        TeamController.get id, (err, team) ->
            if err?
                callback err
            else
                security.checkPassword currentPassword, team.passwordHash, (err, res) ->
                    if err?
                        logger.error err
                        callback new errors.InternalError()
                    else
                        if res
                            security.getPasswordHash newPassword, (err, hash) ->
                                if err?
                                    logger.error err
                                    callback new errors.InternalError()
                                else
                                    team.passwordHash = hash
                                    team.save (err, team) ->
                                        if err?
                                            logger.error err
                                            callback new errors.InternalError()
                                        else
                                            callback null
                        else
                            callback new errors.InvalidTeamPasswordError()

    @list: (callback) ->
        Team.find (err, teams) ->
            if err?
                callback err, null
            else
                callback null, teams

    @listQualified: (callback) ->
        Team.find emailConfirmed: yes, (err, teams) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                callback null, teams

    @resetPassword: (encodedEmail, encodedToken, newPassword, callback) ->
        try
            email = token.decodeString encodedEmail
            code = token.decode encodedToken
            unless code?
                throw 'Reset password code is null'
        catch e
            logger.error e
            callback new errors.InvalidResetPasswordURLError()
            return

        params = email: email, resetPasswordToken: code
        Team.findOne params, (err, team) ->
            if team?
                security.getPasswordHash newPassword, (err, hash) ->
                    if err?
                        logger.error err
                        callback new errors.InternalError()
                    else
                        team.passwordHash = hash
                        team.resetPasswordToken = null
                        team.save (err, team) ->
                            if err?
                                logger.error err
                                callback new errors.InternalError()
                            else
                                callback null
            else
                callback new errors.InvalidResetPasswordURLError()

    @verifyEmail: (encodedEmail, encodedToken, callback) ->
        try
            email = token.decodeString encodedEmail
            code = token.decode encodedToken
        catch e
            logger.error e
            callback new errors.InvalidVerificationURLError()
            return

        params = email: email, emailConfirmationToken: code
        Team.findOne params, (err, team) ->
            if team?
                team.emailConfirmed = yes
                team.emailConfirmationToken = null
                team.save (err, team) ->
                    if err?
                        logger.error err
                        callback new errors.InternalError()
                    else
                        callback null
                        publisher.publish 'realtime', new QualifyTeamEvent team
            else
                callback new errors.InvalidVerificationURLError()

    @get: (id, callback) ->
        Team.findOne _id: id, (err, team) ->
            if err?
                callback new errors.TeamNotFoundError(), null
            else
                if team?
                    callback null, team
                else
                    callback new errors.TeamNotFoundError(), null

module.exports = TeamController

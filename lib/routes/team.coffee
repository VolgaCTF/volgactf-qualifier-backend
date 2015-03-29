express = require 'express'
bodyParser = require 'body-parser'
busboy = require 'connect-busboy'
logger = require '../utils/logger'
constraints = require '../utils/constraints'
tmp = require 'tmp'
fs = require 'fs'
gm = require 'gm'
path = require 'path'

Team = require '../models/team'
TeamController = require '../controllers/team'
Validator = require 'validator.js'
validator = new Validator.Validator()
router = express.Router()
urlencodedParser = bodyParser.urlencoded extended: no
errors = require '../utils/errors'


router.get '/logo/:teamId', (request, response) ->
    Team.findOne _id: request.params.teamId, (err, team) ->
        if err?
            response.status(404).send ''
        else
            filename = path.join process.env.LOGOS_DIR, "team-#{request.params.teamId}.png"
            fs.lstat filename, (err, stats) ->
                if err?
                    nologoFilename = path.join __dirname, '..', '..', 'nologo.png'
                    response.sendFile nologoFilename
                else
                    response.sendFile filename


router.post '/verify-email', urlencodedParser, (request, response, next) ->
    verifyConstraints =
        team: constraints.base64url
        code: constraints.base64url

    validationResult = validator.validate request.body, verifyConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    TeamController.verifyEmail request.body.team, request.body.code, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.post '/change-password', urlencodedParser, (request, response, next) ->
    if not request.session.authenticated? or not request.session.role is 'team'
        throw new errors.NotAuthenticatedError()

    changeConstraints =
        currentPassword: constraints.password
        newPassword: constraints.password

    validationResult = validator.validate request.body, changeConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    TeamController.changePassword request.session.identityID, request.body.currentPassword, request.body.newPassword, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.post '/edit-profile', urlencodedParser, (request, response, next) ->
    if not request.session.authenticated? or not request.session.role is 'team'
        throw new errors.NotAuthenticatedError()

    editConstraints =
        country: constraints.country
        locality: constraints.locality
        institution: constraints.institution

    validationResult = validator.validate request.body, editConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    TeamController.editProfile request.session.identityID, request.body.country, request.body.locality, request.body.institution, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.post '/resend-confirmation-email', (request, response, next) ->
    if not request.session.authenticated? or not request.session.role is 'team'
        throw new errors.NotAuthenticatedError()

    TeamController.resendConfirmationEmail request.session.identityID, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.post '/change-email', urlencodedParser, (request, response, next) ->
    if not request.session.authenticated? or not request.session.role is 'team'
        throw new errors.NotAuthenticatedError()

    changeConstraints =
        email: constraints.email

    validationResult = validator.validate request.body, changeConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    TeamController.changeEmail request.session.identityID, request.body.email, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.get '/profile/:teamId', (request, response) ->
    Team.findOne _id: request.params.teamId, (err, team) ->
        if err?
            response.status(404).json 'Team not found!'
        else
            result =
                id: team._id
                name: team.name
                country: team.country
                locality: team.locality
                institution: team.institution
            if request.session.authenticated? and request.session.role is 'team' and request.session.identityID == team._id
                result.email = team.email
            response.json result


router.post '/signin', urlencodedParser, (request, response, next) ->
    if request.session.authenticated?
        throw new errors.AlreadyAuthenticatedError()

    signinConstraints =
        team: constraints.team
        password: constraints.password

    validationResult = validator.validate request.body, signinConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    TeamController.signin request.body.team, request.body.password, (err, team) ->
        if err?
            next err
        else
            request.session.authenticated = yes
            request.session.identityID = team._id
            request.session.role = 'team'
            response.json success: yes


multidataParser = busboy
    immediate: yes
    limits:
        fieldSize: 200
        fields: 10
        fileSize: 1 * 1024 * 1024
        files: 1

router.post '/signup', multidataParser, (request, response, next) ->
    if request.session.authenticated?
        throw new errors.AlreadyAuthenticatedError()

    teamInfo = {}
    teamLogo = tmp.fileSync()

    request.busboy.on 'file', (fieldName, file, filename, encoding, mimetype) ->
        file.on 'data', (data) ->
            if fieldName is 'logo'
                fs.appendFileSync teamLogo.name, data
                teamInfo['logoFilename'] = teamLogo.name

    request.busboy.on 'field', (fieldName, val, fieldNameTruncated, valTruncated) ->
        teamInfo[fieldName] = val

    request.busboy.on 'finish', ->
        signupConstraints =
            team: constraints.team
            email: constraints.email
            password: constraints.password
            country: constraints.country
            locality: constraints.locality
            institution: constraints.institution

        validationResult = validator.validate teamInfo, signupConstraints
        if validationResult is true
            gm(teamLogo.name).size (err, size) ->
                if err?
                    logger.error err
                    next new errors.InvalidImageError()
                else
                    if size.width < 48
                        next new errors.ImageDimensionsError()
                    else if size.width != size.height
                        next new errors.ImageAspectRatioError()
                    else
                        TeamController.create teamInfo, (err, team) ->
                            if err?
                                next err
                            else
                                response.json success: yes
        else
            next new errors.ValidationError()


module.exports = router

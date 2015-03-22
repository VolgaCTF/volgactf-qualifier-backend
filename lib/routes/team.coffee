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


router.post '/verify-email', urlencodedParser, (request, response) ->
    verifyConstraints =
        team: constraints.base64url
        code: constraints.base64url

    validationResult = validator.validate request.body, verifyConstraints
    if validationResult is true
        TeamController.verifyEmail request.body.team, request.body.code, (err) ->
            if err?
                response.status(400).json err
            else
                response.status(200).json success: yes
    else
        response.status(400).json 'Validation error!'


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


router.post '/signin', urlencodedParser, (request, response) ->
    if request.session.authenticated?
        response.status(400).json 'Already authenticated!'
    else
        signinConstraints =
            team: constraints.team
            password: constraints.password

        validationResult = validator.validate request.body, signinConstraints
        if validationResult is true
            TeamController.signin request.body.team, request.body.password, (err, team) ->
                if err?
                    logger.error err
                    response.status(400).json 'Invalid team or password!'
                else
                    if team?
                        request.session.authenticated = yes
                        request.session.identityID = team._id
                        request.session.role = 'team'
                        response.status(200).json success: yes
                    else
                        response.status(400).json 'Invalid team or password!'
        else
            response.status(400).json 'Validation error!'


multidataParser = busboy immediate: yes

router.post '/signup', multidataParser, (request, response) ->
    if request.session.authenticated?
        response.status(400).json 'Already authenticated!'
    else
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
                        response.status(400).json 'Invalid image logo!'
                    else
                        if size.width < 48
                            response.status(400).json 'Image should be wider than 48px!'
                        else if size.width != size.height
                            response.status(400).json 'Image width should equal image height!'
                        else
                            TeamController.create teamInfo, (err, team) ->
                                if err?
                                    response.status(400).json err
                                else
                                    response.status(200).json success: yes
            else
                response.status(400).json 'Validation error!'


module.exports = router

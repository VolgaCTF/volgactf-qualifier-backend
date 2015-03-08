express = require 'express'
bodyParser = require 'body-parser'
busboy = require 'connect-busboy'
logger = require '../utils/logger'
constraints = require '../utils/constraints'
Team = require '../models/team'
TeamController = require '../controllers/team'
Validator = require 'validator.js'
validator = new Validator.Validator()
router = express.Router()
urlencodedParser = bodyParser.urlencoded extended: no

router.post '/signin', urlencodedParser, (request, response) ->
    if request.session.authenticated?
        response.status(400).json 'Already autheticated!'
    else
        signinConstraints =
            team: constraints.team
            password: constraints.password

        validationResult = validator.validate request.body, signinConstraints
        if validationResult is true
            response.json success: yes
        else
            response.status(400).json 'Validation error!'


multidataParser = busboy immediate: yes

router.post '/signup', multidataParser, (request, response) ->
    teamInfo = {}
    teamLogo = ''
    request.busboy.on 'file', (fieldName, file, filename, encoding, mimetype) ->
        file.on 'data', (data) ->
            if fieldName is 'logo'
                teamLogo += data

        file.on 'end', ->
            console.log "File [#{fieldName}] Finished"

    request.busboy.on 'field', (fieldName, val, fieldNameTruncated, valTruncated) ->
        teamInfo[fieldName] = val

    request.busboy.on 'finish', ->
        logger.info teamInfo

        TeamController.new teamInfo, (err, team) ->
            if err?
                response.status(400).json error: ''
            else
                response.status(201).json success: yes

module.exports = router

express = require 'express'
bodyParser = require 'body-parser'
busboy = require 'connect-busboy'
inspect = require('util').inspect
Team = require '../models/team'
TeamController = require '../controllers/team'

router = express.Router()
urlencodedParser = bodyParser.urlencoded extended: no

router.post '/signin', urlencodedParser, (request, response) ->
    console.log request.body
    response.json 'signin'

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
        console.log inspect teamInfo
        TeamController.new teamInfo, (err, team) ->
            if err?
                response.status(400).json error: inspect err
            else
                response.status(201).json success: yes

module.exports = router

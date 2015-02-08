express = require 'express'
bodyParser = require 'body-parser'
busboy = require 'connect-busboy'
inspect = require('util').inspect
Team = require '../models/team'

router = express.Router()
urlencodedParser = bodyParser.urlencoded extended: no

router.get '/', (request, response) ->
    Team.find {}, (err, teams) ->
        response.json teams

router.post '/signin', urlencodedParser, (request, response) ->
    console.log request.body
    response.json 'signin'

multidataParser = busboy immediate: yes

router.post '/signup', multidataParser, (request, response) ->
    request.busboy.on 'file', (fieldname, file, filename, encoding, mimetype) ->
        console.log "File [#{fieldname}]: filename: #{filename}"
        file.on 'data', (data) ->
            console.log "File [#{fieldname}] got #{data.length} bytes"

        file.on 'end', ->
            console.log "File [#{fieldname}] Finished"

    request.busboy.on 'field', (fieldname, val, fieldnameTruncated, valTruncated) ->
      console.log "Field [#{fieldname}]: value: #{inspect(val)}"

    request.busboy.on 'finish', ->
        console.log 'Done parsing form!'
        response.json 'signup'

module.exports = router

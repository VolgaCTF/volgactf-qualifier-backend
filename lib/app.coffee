express = require 'express'

app = express()

app.get '/', (request, response) ->
    response.send 'Hello, world!'

getServerPort = ->
    parseInt(process.env.SERVER_PORT, 10) or 3000

exports.run = ->
    server = app.listen getServerPort(), ->
        port = server.address().port
        console.log "Server listening on port #{port}"
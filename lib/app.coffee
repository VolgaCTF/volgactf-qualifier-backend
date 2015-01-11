express = require 'express'

app = express()

app.get '/', (request, response) ->
    response.json 'Hello, world!'

module.exports = app

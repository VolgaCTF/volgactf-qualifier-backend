express = require 'express'

redis = require './redis'
client = redis.createClient()

app = express()

app.get '/', (request, response) ->
    response.json 'Hello, world!'

module.exports = app

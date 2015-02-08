express = require 'express'

redis = require './redis'
client = redis.createClient()

teamRouter = require './team'

app = express()

app.get '/', (request, response) ->
    response.json 'Hello, world!'

app.use '/team', teamRouter

module.exports = app

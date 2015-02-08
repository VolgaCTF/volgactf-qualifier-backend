express = require 'express'

redis = require './utils/redis'
client = redis.createClient()

teamRouter = require './routes/team'

app = express()

app.get '/', (request, response) ->
    response.json 'Hello, world!'

app.use '/team', teamRouter

module.exports = app

express = require 'express'

redis = require './utils/redis'
client = redis.createClient()

teamRouter = require './routes/team'

app = express()

app.use (request, response, next) ->
    response.header 'Access-Control-Allow-Origin', process.env.CORS_ORIGIN
    next()

app.use '/team', teamRouter

module.exports = app

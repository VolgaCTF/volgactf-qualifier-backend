redis = require 'redis'

host = process.env.REDIS_HOST ? '127.0.0.1'
port = if process.env.REDIS_PORT? then parseInt(process.env.REDIS_PORT, 10) else 6379
database = if process.env.REDIS_DB? then parseInt(process.env.REDIS_DB, 10) else 0

module.exports =
    createClient: ->
        redis.createClient port, host, db: database

redis = require 'redis'

host = process.env['REDIS_HOST'] ? '127.0.0.1'
port = parseInt(process.env['REDIS_PORT'], 10) ? 6379
database = parseInt(process.env['REDIS_DB'], 10) ? 0

module.exports =
    createClient: (options) ->
        client = redis.createClient host, port, options
        client.select database
        client

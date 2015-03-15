Queue = require 'bull'

host = process.env.REDIS_HOST ? '127.0.0.1'
port = if process.env.REDIS_PORT? then parseInt(process.env.REDIS_PORT, 10) else 6379

module.exports = (name) ->
    Queue name, port, host

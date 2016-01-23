Queue = require 'bull'

host = process.env.REDIS_HOST ? '127.0.0.1'
port = if process.env.REDIS_PORT? then parseInt(process.env.REDIS_PORT, 10) else 6379
database = if process.env.REDIS_DB? then parseInt(process.env.REDIS_DB, 10) else 0
prefix = process.env.QUEUE_PREFIX ? 'themis-quals'

module.exports = (name) ->
    Queue "#{prefix}:#{name}", port, host, db: database

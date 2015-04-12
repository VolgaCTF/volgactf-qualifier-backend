redis = require './redis'

client = redis.createClient()

module.exports.publish = (channel, message) ->
    client.publish channel, JSON.stringify message

redis = require './redis'

client = redis.createClient()

module.exports.subscribe = (channel) ->
    client.subscribe channel

module.exports.on = (eventName, callback) ->
    client.on eventName, callback

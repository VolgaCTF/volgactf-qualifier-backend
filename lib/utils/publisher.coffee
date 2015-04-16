redis = require './redis'

client = redis.createClient()

module.exports.publish = (channel, eventObject) ->
    client.publish channel, JSON.stringify eventObject.serialize()

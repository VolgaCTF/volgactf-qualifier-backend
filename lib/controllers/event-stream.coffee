EventEmitter = require('events').EventEmitter
subscriber = require '../utils/subscriber'
_ = require 'underscore'


class EventStream extends EventEmitter
    run: ->
        subscriber.subscribe 'realtime'
        subscriber.on 'message', (channel, message) =>
            now = new Date()
            obj = JSON.parse message
            name = obj.name
            obj = _.omit obj, 'name'
            message = JSON.stringify obj

            @emit 'message', "id: #{now.getTime()}\nevent: #{name}\nretry: 5000\ndata: #{message}\n\n"


module.exports = new EventStream()

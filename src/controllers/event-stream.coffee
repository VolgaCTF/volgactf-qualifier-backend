EventEmitter = require('events').EventEmitter
subscriber = require '../utils/subscriber'
_ = require 'underscore'
logger = require '../utils/logger'


class EventStream extends EventEmitter
    constructor: (maxListeners) ->
        super()
        @setMaxListeners maxListeners

    format: (id, name, retry, obj) ->
        "id: #{id}\nevent: #{name}\nretry: #{retry}\ndata: #{JSON.stringify obj}\n\n"

    run: ->
        subscriber.subscribe 'realtime'
        subscriber.on 'message', (channel, data) =>
            message = JSON.parse data

            name = message.name
            eventId = (new Date()).getTime()

            dataForSupervisors = message.data.supervisors
            if dataForSupervisors?
                @emit 'message:supervisors', @format eventId, name, 5000, dataForSupervisors

            dataForTeams = message.data.teams
            if dataForTeams?
                @emit 'message:teams', @format eventId, name, 5000, dataForTeams

            dataForGuests = message.data.guests
            if dataForGuests?
                @emit 'message:guests', @format eventId, name, 5000, dataForGuests

            for teamId, dataForTeam of message.data.team
                @emit "message:team#{teamId}", @format eventId, name, 5000, dataForTeam


maxStreamConnections = if process.env.MAX_STREAM_CONNECTIONS? then parseInt(process.env.MAX_STREAM_CONNECTIONS, 10) else 1024
module.exports = new EventStream maxStreamConnections

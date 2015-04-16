
class module.exports.BaseEvent
    constructor: (name) ->
        @name = name
        @data =
            supervisors: null
            teams: null
            guests: null

    serialize: ->
        result =
            name: @name
            data:
                supervisors: @data.supervisors
                teams: @data.teams
                guests: @data.guests

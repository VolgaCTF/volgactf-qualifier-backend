errors = require '../utils/errors'
is_ = require 'is_js'


module.exports.id = (request, response, next, teamId) ->
    id = parseInt teamId, 10
    unless is_.number id
        throw new errors.ValidationError()

    request.teamId = id
    next()

errors = require '../utils/errors'
is_ = require 'is_js'


module.exports.id = (request, response, next, taskId) ->
    id = parseInt taskId, 10
    unless is_.number id
        throw new errors.ValidationError()

    request.taskId = id
    next()

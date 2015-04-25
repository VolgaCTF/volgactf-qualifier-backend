errors = require '../utils/errors'
is_ = require 'is_js'


module.exports.id = (request, response, next, taskCategoryId) ->
    id = parseInt taskCategoryId, 10
    unless is_.number id
        throw new errors.ValidationError()

    request.taskCategoryId = id
    next()

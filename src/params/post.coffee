errors = require '../utils/errors'
is_ = require 'is_js'


module.exports.id = (request, response, next, postId) ->
    id = parseInt postId, 10
    unless is_.number id
        throw new errors.ValidationError()

    request.postId = id
    next()

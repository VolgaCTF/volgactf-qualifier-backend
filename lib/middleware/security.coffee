errors = require '../utils/errors'


module.exports.checkToken = (request, response, next) ->
    unless request.get('X-CSRF-Token') == request.session.token
        throw new errors.InvalidCSRFTokenError()

    next()

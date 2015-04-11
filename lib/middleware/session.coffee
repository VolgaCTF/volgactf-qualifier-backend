errors = require '../utils/errors'
_ = require 'underscore'


module.exports.needsToBeUnauthorized = (request, response, next) ->
    if request.session.authenticated
        throw new errors.AlreadyAuthenticatedError()
    else
        next()


module.exports.needsToBeAuthorizedTeam = (request, response, next) ->
    if request.session.authenticated and request.session.role is 'team'
        next()
    else
        throw new errors.NotAuthenticatedError()


module.exports.needsToBeAuthorizedSupervisor = (request, response, next) ->
    if request.session.authenticated and _.contains(['admin', 'manager'], request.session.role)
        next()
    else
        throw new errors.NotAuthenticatedError()

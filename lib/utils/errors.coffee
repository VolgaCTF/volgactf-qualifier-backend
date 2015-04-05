class module.exports.BaseError extends Error
    constructor: (message, name = 'Error', httpStatus = 400) ->
        super()
        @message = message
        @name = name
        @httpStatus = httpStatus

    getHttpStatus: ->
        @httpStatus


class module.exports.ValidationError extends module.exports.BaseError
    constructor: ->
        super 'Validation error!', 'ValidationError', 400


class module.exports.AlreadyAuthenticatedError extends module.exports.BaseError
    constructor: ->
        super 'Already authenticated!', 'AlreadyAuthenticatedError', 400


class module.exports.InvalidSupervisorCredentialsError extends module.exports.BaseError
    constructor: ->
        super 'Invalid username or password!', 'InvalidSupervisorCredentialsError', 400


class module.exports.NotAuthenticatedError extends module.exports.BaseError
    constructor: ->
        super 'Not authenticated', 'NotAuthenticatedError', 400


class module.exports.UnknownIdentityError extends module.exports.BaseError
    constructor: ->
        super 'Unknown identity!', 'UnknownIdentityError', 400


class module.exports.InvalidVerificationURLError extends module.exports.BaseError
    constructor: ->
        super 'Invalid verification URL!', 'InvalidVerificationURLError', 400


class module.exports.InternalError extends module.exports.BaseError
    constructor: ->
        super 'Internal error! Please try again later.', 'InternalError', 500


class module.exports.TeamNotFoundError extends module.exports.BaseError
    constructor: ->
        super 'Team not found!', 'TeamNotFoundError', 400


class module.exports.InvalidTeamPasswordError extends module.exports.BaseError
    constructor: ->
        super 'Wrong password!', 'InvalidTeamPasswordError', 400


class module.exports.EmailConfirmedError extends module.exports.BaseError
    constructor: ->
        super 'Email already confirmed!', 'EmailConfirmedError', 400


class module.exports.EmailTakenError extends module.exports.BaseError
    constructor: ->
        super 'Email already taken by another team!', 'EmailTakenError', 400


class module.exports.InvalidTeamCredentialsError extends module.exports.BaseError
    constructor: ->
        super 'Invalid team name or password!', 'InvalidTeamCredentialsError', 400


class module.exports.InvalidImageError extends module.exports.BaseError
    constructor: ->
        super 'Invalid image!', 'InvalidImageError', 400


class module.exports.ImageDimensionsError extends module.exports.BaseError
    constructor: ->
        super 'Image dimensions should be greater than or equal 48px!', 'ImageDimensionsError', 400


class module.exports.ImageAspectRatioError extends module.exports.BaseError
    constructor: ->
        super 'Image width should equal image height!', 'ImageAspectRatioError', 400


class module.exports.TeamCredentialsTakenError extends module.exports.BaseError
    constructor: ->
        super 'Specified credentials (team name and/or email) already taken!', 'TeamCredentialsTakenError', 400


class module.exports.PostNotFoundError extends module.exports.BaseError
    constructor: ->
        super 'Post not found!', 'PostNotFoundError', 400

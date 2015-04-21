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


class module.exports.DuplicatePostTitleError extends module.exports.BaseError
    constructor: ->
        super 'Post title should be unique!', 'DuplicatePostTitleError', 400


class module.exports.InvalidCSRFTokenError extends module.exports.BaseError
    constructor: ->
        super 'Invalid CSRF token!', 'InvalidCSRFTokenError', 400


class module.exports.ContestNotInitializedError extends module.exports.BaseError
    constructor: ->
        super 'Contest not initialized!', 'ContestNotInitializedError', 400


class module.exports.TaskCategoryNotFoundError extends module.exports.BaseError
    constructor: ->
        super 'Task category not found!', 'TaskCategoryNotFoundError', 400


class module.exports.DuplicateTaskCategoryTitleError extends module.exports.BaseError
    constructor: ->
        super 'Task category title should be unique!', 'DuplicateTaskCategoryTitleError', 400


class module.exports.ContestFinishedError extends module.exports.BaseError
    constructor: ->
        super 'Contest has finished!', 'ContestFinishedError', 400


class module.exports.DuplicateTaskTitleError extends module.exports.BaseError
    constructor: ->
        super 'Task title should be unique!', 'DuplicateTaskTitleError', 400


class module.exports.TaskNotFoundError extends module.exports.BaseError
    constructor: ->
        super 'Task not found!', 'TaskNotFoundError', 400


class module.exports.WrongTaskAnswerError extends module.exports.BaseError
    constructor: ->
        super 'Wrong answer!', 'WrongTaskAnswerError', 400


class module.exports.ContestNotStartedError extends module.exports.BaseError
    constructor: ->
        super 'Contest has not started or has already finished!', 'ContestNotStartedError', 400


class module.exports.TaskAlreadyOpenedError extends module.exports.BaseError
    constructor: ->
        super 'Task has been already opened!', 'TaskAlreadyOpenedError', 400


class module.exports.TaskClosedError extends module.exports.BaseError
    constructor: ->
        super 'Task has been closed!', 'TaskClosedError', 400


class module.exports.TaskNotOpenedError extends module.exports.BaseError
    constructor: ->
        super 'Task is not opened now!', 'TaskNotOpenedError', 400


class module.exports.TaskAlreadyClosedError extends module.exports.BaseError
    constructor: ->
        super 'Task has been already closed!', 'TaskAlreadyClosedError', 400

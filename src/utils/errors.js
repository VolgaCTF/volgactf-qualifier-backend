
export class BaseError extends Error {
  constructor(message, name = 'Error', httpStatus = 400) {
    super()
    this.message = message
    this.name = name
    this.httpStatus = httpStatus
  }

  getHttpStatus() {
    return this.httpStatus
  }
}


export class ValidationError extends BaseError {
  constructor() {
    super('Validation error!', 'ValidationError', 400)
  }
}


export class AlreadyAuthenticatedError extends BaseError {
  constructor() {
    super('Already authenticated!', 'AlreadyAuthenticatedError', 400)
  }
}


export class InvalidSupervisorCredentialsError extends BaseError {
  constructor() {
    super('Invalid username or password!', 'InvalidSupervisorCredentialsError', 400)
  }
}


export class NotAuthenticatedError extends BaseError {
  constructor() {
    super('Not authenticated', 'NotAuthenticatedError', 400)
  }
}


export class UnknownIdentityError extends BaseError {
  constructor() {
    super('Unknown identity!', 'UnknownIdentityError', 400)
  }
}


export class InvalidVerificationURLError extends BaseError {
  constructor() {
    super('Invalid verification URL!', 'InvalidVerificationURLError', 400)
  }
}


export class InternalError extends BaseError {
  constructor() {
    super('Internal error! Please try again later.', 'InternalError', 500)
  }
}


export class TeamNotFoundError extends BaseError {
  constructor() {
    super('Team not found!', 'TeamNotFoundError', 400)
  }
}


export class InvalidTeamPasswordError extends BaseError {
  constructor() {
    super('Wrong password!', 'InvalidTeamPasswordError', 400)
  }
}


export class EmailConfirmedError extends BaseError {
  constructor() {
    super('Email already confirmed!', 'EmailConfirmedError', 400)
  }
}


export class EmailTakenError extends BaseError {
  constructor() {
    super('Email already taken by another team!', 'EmailTakenError', 400)
  }
}


export class InvalidTeamCredentialsError extends BaseError {
  constructor() {
    super('Invalid team name or password!', 'InvalidTeamCredentialsError', 400)
  }
}


export class InvalidImageError extends BaseError {
  constructor() {
    super('Invalid image!', 'InvalidImageError', 400)
  }
}


export class ImageDimensionsError extends BaseError {
  constructor() {
    super('Image dimensions should be greater than or equal 48px!', 'ImageDimensionsError', 400)
  }
}


export class ImageAspectRatioError extends BaseError {
  constructor() {
    super('Image width should equal image height!', 'ImageAspectRatioError', 400)
  }
}


export class TeamCredentialsTakenError extends BaseError {
  constructor() {
    super('Specified credentials (team name and/or email) already taken!', 'TeamCredentialsTakenError', 400)
  }
}


export class PostNotFoundError extends BaseError {
  constructor() {
    super('Post not found!', 'PostNotFoundError', 400)
  }
}


export class DuplicatePostTitleError extends BaseError {
  constructor() {
    super('Post title should be unique!', 'DuplicatePostTitleError', 400)
  }
}


export class InvalidCSRFTokenError extends BaseError {
  constructor() {
    super('Invalid CSRF token!', 'InvalidCSRFTokenError', 400)
  }
}


export class ContestNotInitializedError extends BaseError {
  constructor() {
    super('Contest not initialized!', 'ContestNotInitializedError', 400)
  }
}


export class TaskCategoryNotFoundError extends BaseError {
  constructor() {
    super('Task category not found!', 'TaskCategoryNotFoundError', 400)
  }
}


export class DuplicateTaskCategoryTitleError extends BaseError {
  constructor() {
    super('Task category title should be unique!', 'DuplicateTaskCategoryTitleError', 400)
  }
}


export class ContestFinishedError extends BaseError {
  constructor() {
    super('Contest has finished!', 'ContestFinishedError', 400)
  }
}


export class DuplicateTaskTitleError extends BaseError {
  constructor() {
    super('Task title should be unique!', 'DuplicateTaskTitleError', 400)
  }
}


export class TaskNotFoundError extends BaseError {
  constructor() {
    super('Task not found!', 'TaskNotFoundError', 400)
  }
}


export class WrongTaskAnswerError extends BaseError {
  constructor() {
    super('Wrong answer!', 'WrongTaskAnswerError', 400)
  }
}


export class ContestNotStartedError extends BaseError {
  constructor() {
    super('Contest has not started or has already finished!', 'ContestNotStartedError', 400)
  }
}


export class ContestPausedError extends BaseError {
  constructor() {
    super('Contest has been paused!', 'ContestPausedError', 400)
  }
}


export class TaskAlreadyOpenedError extends BaseError {
  constructor() {
    super('Task has been already opened!', 'TaskAlreadyOpenedError', 400)
  }
}


export class TaskClosedError extends BaseError {
  constructor() {
    super('Task has been closed!', 'TaskClosedError', 400)
  }
}


export class TaskNotOpenedError extends BaseError {
  constructor() {
    super('Task is not opened now!', 'TaskNotOpenedError', 400)
  }
}


export class TaskAlreadyClosedError extends BaseError {
  constructor() {
    super('Task has been already closed!', 'TaskAlreadyClosedError', 400)
  }
}


export class TaskAlreadySolvedError extends BaseError {
  constructor() {
    super('Task has been already solved by your team!', 'TaskAlreadySolvedError', 400)
  }
}


export class TaskCategoryAttachedError extends BaseError {
  constructor() {
    super('Task category is attached to one or more tasks!', 'TaskCategoryAttachedError', 400)
  }
}


export class TaskSubmitAttemptsLimitError extends BaseError {
  constructor() {
    super('Too many submit attempts!', 'TaskSubmitAttemptsLimitError', 400)
  }
}


export class EmailNotConfirmedError extends BaseError {
  constructor() {
    super('You should confirm your email before you can submit an answer to the task', 'EmailNotConfirmedError', 400)
  }
}


export class InvalidResetPasswordURLError extends BaseError {
  constructor() {
    super('Invalid reset password URL!', 'InvalidResetPasswordURLError', 400)
  }
}
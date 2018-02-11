const express = require('express')

const { checkToken } = require('../middleware/security')
const { detectScope, needsToBeAuthorizedSupervisor, needsToBeAuthorizedTeam, needsToBeAuthorizedAdmin } = require('../middleware/session')
const { getState, contestIsStarted, contestIsFinished, contestNotFinished } = require('../middleware/contest')
const { getTask } = require('../middleware/task')
const { getTeam } = require('../middleware/team')

const constraints = require('../utils/constraints')
const logger = require('../utils/logger')
const queue = require('../utils/queue')

const bodyParser = require('body-parser')
const Validator = require('validator.js')
const validator = new Validator.Validator()
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const urlencodedExtendedParser = bodyParser.urlencoded({ extended: true })

const router = express.Router()

const { InternalError, NotAuthenticatedError, TeamNotQualifiedError, TaskSubmitAttemptsLimitError, WrongTaskAnswerError,
  ValidationError, TaskNotAvailableError } = require('../utils/errors')
const is_ = require('is_js')
const _ = require('underscore')

const TaskController = require('../controllers/task')
const TaskCategoryController = require('../controllers/task-category')
const TaskAnswerController = require('../controllers/task-answer')
const TaskHintController = require('../controllers/task-hint')
const TeamTaskHitController = require('../controllers/team-task-hit')
const taskSerializer = require('../serializers/task')
const taskCategorySerializer = require('../serializers/task-category')
const taskAnswerSerializer = require('../serializers/task-answer')
const taskHintSerializer = require('../serializers/task-hint')
const { TASK_SUBMIT_LIMIT_TIME, TASK_SUBMIT_LIMIT_ATTEMPTS } = require('../utils/constants')
const taskParam = require('../params/task')
const TeamTaskHitAttemptController = require('../controllers/team-task-hit-attempt')
const TeamTaskReviewController = require('../controllers/team-task-review')
const teamTaskReviewSerializer = require('../serializers/team-task-review')

const LimitController = require('../controllers/limit')
const when_ = require('when')
const teamTaskHitSerializer = require('../serializers/team-task-hit')

router.param('taskId', taskParam.id)

router.get('/index', detectScope, function (request, response, next) {
  TaskController.index(function (err, tasks) {
    if (err) {
      logger.error(err)
      next(new InternalError())
    } else {
      const serializer = _.partial(taskSerializer, _, { preview: true })
      response.json(_.map(tasks, serializer))
    }
  }, !request.scope.isSupervisor())
})

router.get('/category/index', detectScope, function (request, response, next) {
  TaskController.index(function (err, tasks) {
    if (err) {
      logger.error(err)
      next(new InternalError())
    } else {
      const taskIds = _.map(tasks, function (task) {
        return task.id
      })

      TaskCategoryController.indexByTasks(taskIds, function (err, taskCategories) {
        if (err) {
          next(err)
        } else {
          response.json(_.map(taskCategories, taskCategorySerializer))
        }
      })
    }
  }, !request.scope.isSupervisor())
})

router.get('/:taskId/category', detectScope, getTask, function (request, response, next) {
  if (request.task.isInitial() && (request.scope.isGuest() || request.scope.isTeam())) {
    throw new NotAuthenticatedError()
  } else {
    TaskCategoryController.indexByTask(request.task.id, function (err, taskCategories) {
      if (err) {
        next(err)
      } else {
        response.json(_.map(taskCategories, taskCategorySerializer))
      }
    })
  }
})

router.get('/:taskId/answer', needsToBeAuthorizedAdmin, function (request, response, next) {
  TaskAnswerController.listByTask(request.taskId, function (err, taskAnswers) {
    if (err) {
      next(err)
    } else {
      response.json(taskAnswers.map(taskAnswerSerializer))
    }
  })
})

router.get('/:taskId/hint', detectScope, getTask, getState, function (request, response, next) {
  const guestsEligible = (request.scope.isGuest() && request.contest && request.contest.isFinished() && request.task.isOpened())
  const teamsEligible = (request.scope.isTeam() && request.contest && !request.contest.isInitial() && request.task.isOpened())
  const supervisorsEligible = request.scope.isSupervisor()

  if (!guestsEligible && !teamsEligible && !supervisorsEligible) {
    throw new NotAuthenticatedError()
  }

  TaskHintController.listByTask(request.task.id, function (err, taskHints) {
    if (err) {
      next(err)
    } else {
      response.json(_.map(taskHints, taskHintSerializer))
    }
  })
})

router.get('/hit/index', needsToBeAuthorizedSupervisor, function (request, response, next) {
  TeamTaskHitController.list(function (err, teamTaskHits) {
    if (err) {
      next(err)
    } else {
      response.json(_.map(teamTaskHits, teamTaskHitSerializer))
    }
  })
})

router.get('/:taskId/hit/statistics', detectScope, function (request, response, next) {
  if (!request.scope.isTeam() && !request.scope.isSupervisor()) {
    throw new NotAuthenticatedError()
  }

  TeamTaskHitController.listForTask(request.taskId, function (err, teamTaskHits) {
    if (err) {
      next(err)
    } else {
      response.json({
        count: teamTaskHits.length
      })
    }
  })
})

router.get('/:taskId/hit/index', needsToBeAuthorizedSupervisor, function (request, response, next) {
  TeamTaskHitController.listForTask(request.taskId, function (err, teamTaskHits) {
    if (err) {
      next(err)
    } else {
      response.json(teamTaskHits.map(teamTaskHitSerializer))
    }
  })
})

router.get('/:taskId', detectScope, getState, getTask, function (request, response, next) {
  const guestsEligible = (request.scope.isGuest() && request.contest && request.contest.isFinished() && request.task.isOpened())
  const teamsEligible = (request.scope.isTeam() && request.contest && !request.contest.isInitial() && request.task.isOpened())
  const supervisorsEligible = request.scope.isSupervisor()

  if (!(guestsEligible || teamsEligible || supervisorsEligible)) {
    throw new NotAuthenticatedError()
  }

  response.json(taskSerializer(request.task))
})

router.get('/:taskId/review/index', detectScope, function (request, response, next) {
  if (!request.scope.isTeam() && !request.scope.isSupervisor()) {
    throw new NotAuthenticatedError()
  }

  if (request.scope.isTeam()) {
    TeamTaskReviewController.indexByTeamAndTask(request.session.identityID, request.taskId, function (err, teamTaskReviews) {
      if (err) {
        next(err)
      } else {
        response.json(_.map(teamTaskReviews, teamTaskReviewSerializer))
      }
    })
  } else if (request.scope.isSupervisor()) {
    TeamTaskReviewController.indexByTask(request.taskId, function (err, teamTaskReviews) {
      if (err) {
        next(err)
      } else {
        response.json(_.map(teamTaskReviews, teamTaskReviewSerializer))
      }
    })
  } else {
    response.json([])
  }
})

router.get('/:taskId/review/statistics', detectScope, function (request, response, next) {
  if (!request.scope.isTeam() && !request.scope.isSupervisor()) {
    throw new NotAuthenticatedError()
  }

  TeamTaskReviewController.indexByTask(request.taskId, function (err, teamTaskReviews) {
    if (err) {
      next(err)
    } else {
      const averageRating = _.reduce(teamTaskReviews, function (sum, review) {
        return sum + review.rating
      }, 0) / (teamTaskReviews.length === 0 ? 1 : teamTaskReviews.length)

      response.json({
        count: teamTaskReviews.length,
        averageRating: averageRating
      })
    }
  })
})

function sanitizeReviewTaskParams (params, callback) {
  const sanitizeRating = function () {
    const deferred = when_.defer()
    const value = parseInt(params.rating, 10)
    if (is_.number(value)) {
      deferred.resolve(value)
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  const sanitizeComment = function () {
    const deferred = when_.defer()
    deferred.resolve(params.comment)
    return deferred.promise
  }

  when_
    .all([sanitizeRating(), sanitizeComment()])
    .then(function (res) {
      callback(null, {
        rating: res[0],
        comment: res[1]
      })
    })
    .catch(function (err) {
      logger.error(err)
      callback(err, null)
    })
}

router.post('/:taskId/review', needsToBeAuthorizedTeam, contestIsStarted, checkToken, getTask, getTeam, urlencodedParser, function (request, response, next) {
  if (!request.team.isQualified()) {
    throw new TeamNotQualifiedError()
  }

  sanitizeReviewTaskParams(request.body, function (err, reviewParams) {
    if (err) {
      next(err)
    } else {
      const createConstraints = {
        rating: constraints.reviewRating,
        comment: constraints.reviewComment
      }

      const validationResult = validator.validate(reviewParams, createConstraints)
      if (validationResult === true) {
        TeamTaskReviewController.create(request.team.id, request.task.id, reviewParams.rating, reviewParams.comment, function (err, teamTaskReview) {
          if (err) {
            next(err)
          } else {
            response.json({ success: true })
          }
        })
      } else {
        next(new ValidationError())
      }
    }
  })
})

router.post('/:taskId/submit', needsToBeAuthorizedTeam, contestIsStarted, checkToken, getTask, getTeam, urlencodedParser, function (request, response, next) {
  if (!request.team.isQualified()) {
    throw new TeamNotQualifiedError()
  }

  if (!request.task.isOpened()) {
    throw new TaskNotAvailableError()
  }

  const limiter = new LimitController(`themis__team${request.session.identityID}__task${request.taskId}__submit`, {
    timeout: TASK_SUBMIT_LIMIT_TIME,
    maxAttempts: TASK_SUBMIT_LIMIT_ATTEMPTS
  })

  limiter.check(function (err, limitExceeded) {
    if (err) {
      next(err)
    } else {
      if (limitExceeded) {
        next(new TaskSubmitAttemptsLimitError())
      } else {
        const submitConstraints = {
          answer: constraints.taskAnswer
        }

        const validationResult = validator.validate(request.body, submitConstraints)
        if (validationResult === true) {
          TaskController.checkAnswer(request.task, request.body.answer, function (err, checkResult) {
            if (err) {
              next(err)
            } else {
              if (checkResult) {
                TeamTaskHitController.create(request.session.identityID, request.task, function (err, teamTaskHit) {
                  if (err) {
                    next(err)
                  } else {
                    queue('updateTeamScore').add({ teamId: request.team.id })
                    response.json({ success: true })
                  }
                })
              } else {
                next(new WrongTaskAnswerError())
                TeamTaskHitAttemptController.create(request.session.identityID, request.task.id, request.body.answer, function (err, teamTaskHitAttempt) {
                  if (err) {
                    logger.error(err)
                  }
                })
              }
            }
          })
        } else {
          next(new ValidationError())
        }
      }
    }
  })
})

router.post('/:taskId/revise', checkToken, needsToBeAuthorizedSupervisor, getTask, urlencodedParser, function (request, response, next) {
  const reviseConstraints = {
    answer: constraints.taskAnswer
  }

  const validationResult = validator.validate(request.body, reviseConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TaskController.checkAnswer(request.task, request.body.answer, function (err, checkResult) {
    if (err) {
      next(err)
    } else {
      if (checkResult) {
        response.json({ success: true })
      } else {
        next(new WrongTaskAnswerError())
      }
    }
  })
})

router.post('/:taskId/check', detectScope, checkToken, contestIsFinished, getTask, urlencodedParser, function (request, response, next) {
  if (!request.scope.isGuest() && !request.scope.isTeam()) {
    throw new InternalError()
  }

  if (!request.task.isOpened()) {
    throw new TaskNotAvailableError()
  }

  const checkConstraints = {
    answer: constraints.taskAnswer
  }

  const validationResult = validator.validate(request.body, checkConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TaskController.checkAnswer(request.task, request.body.answer, function (err, checkResult) {
    if (err) {
      next(err)
    } else {
      if (checkResult) {
        response.json({ success: true })
      } else {
        next(new WrongTaskAnswerError())
      }
    }
  })
})

router.post('/:taskId/open', contestIsStarted, checkToken, needsToBeAuthorizedAdmin, getTask, function (request, response, next) {
  TaskController.open(request.task, function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/:taskId/close', contestIsStarted, checkToken, needsToBeAuthorizedAdmin, getTask, function (request, response, next) {
  TaskController.close(request.task, function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

function sanitizeCreateTaskParams (params, callback) {
  const sanitizeTitle = function () {
    const deferred = when_.defer()
    deferred.resolve(params.title)
    return deferred.promise
  }

  const sanitizeDescription = function () {
    const deferred = when_.defer()
    deferred.resolve(params.description)
    return deferred.promise
  }

  const sanitizeHints = function () {
    const deferred = when_.defer()
    let hints = params.hints
    if (!hints) {
      hints = []
    }
    if (is_.string(hints)) {
      hints = [hints]
    }
    hints = _.uniq(hints)
    deferred.resolve(hints)
    return deferred.promise
  }

  const sanitizeValue = function () {
    const deferred = when_.defer()
    const value = parseInt(params.value, 10)
    if (is_.number(value)) {
      deferred.resolve(value)
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  const sanitizeCategories = function () {
    const deferred = when_.defer()
    let categories = params.categories
    if (!categories) {
      categories = []
    }
    if (is_.string(categories)) {
      categories = [categories]
    }

    if (is_.array(categories)) {
      const valCategories = []
      for (const valCategoryStr of categories) {
        const valCategory = parseInt(valCategoryStr, 10)
        if (is_.number(valCategory)) {
          valCategories.push(valCategory)
        }
      }
      deferred.resolve(_.uniq(valCategories))
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  const sanitizeAnswers = function () {
    const deferred = when_.defer()
    let answers = params.answers
    if (!answers) {
      answers = []
    }

    if (is_.array(answers)) {
      deferred.resolve(_.map(answers, function (entry) {
        return {
          answer: entry.answer,
          caseSensitive: entry.caseSensitive === 'true'
        }
      }))
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  when_
    .all([sanitizeTitle(), sanitizeDescription(), sanitizeHints(), sanitizeValue(), sanitizeCategories(), sanitizeAnswers()])
    .then(function (res) {
      callback(null, {
        title: res[0],
        description: res[1],
        hints: res[2],
        value: res[3],
        categories: res[4],
        answers: res[5]
      })
    })
    .catch(function (err) {
      logger.error(err)
      callback(err, null)
    })
}

router.post('/create', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedExtendedParser, function (request, response, next) {
  sanitizeCreateTaskParams(request.body, function (err, taskParams) {
    if (err) {
      next(err)
    } else {
      const createConstraints = {
        title: constraints.taskTitle,
        description: constraints.taskDescription,
        hints: constraints.taskHints,
        value: constraints.taskValue,
        categories: constraints.taskCategories,
        answers: constraints.taskAnswers
      }

      const validationResult = validator.validate(taskParams, createConstraints)
      if (validationResult === true) {
        TaskController.create(taskParams, function (err, task) {
          if (err) {
            next(err)
          } else {
            response.json({ success: true })
          }
        })
      } else {
        next(new ValidationError())
      }
    }
  })
})

function sanitizeUpdateTaskParams (params, task, callback) {
  const sanitizeDescription = function () {
    const deferred = when_.defer()
    deferred.resolve(params.description)
    return deferred.promise
  }

  const sanitizeHints = function () {
    const deferred = when_.defer()
    let hints = params.hints
    if (!hints) {
      hints = []
    }
    if (is_.string(hints)) {
      hints = [hints]
    }
    hints = _.uniq(hints)
    deferred.resolve(hints)
    return deferred.promise
  }

  const sanitizeCategories = function () {
    const deferred = when_.defer()
    let categories = params.categories
    if (!categories) {
      categories = []
    }
    if (is_.string(categories)) {
      categories = [categories]
    }

    if (is_.array(categories)) {
      const valCategories = []
      for (const valCategoryStr of categories) {
        const valCategory = parseInt(valCategoryStr, 10)
        if (is_.number(valCategory)) {
          valCategories.push(valCategory)
        }
      }
      deferred.resolve(_.uniq(valCategories))
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  const sanitizeAnswers = function () {
    const deferred = when_.defer()
    let answers = params.answers
    if (!answers) {
      answers = []
    }

    if (is_.array(answers)) {
      deferred.resolve(_.map(answers, function (entry) {
        return {
          answer: entry.answer,
          caseSensitive: entry.caseSensitive === 'true'
        }
      }))
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  when_
    .all([sanitizeDescription(), sanitizeHints(), sanitizeCategories(), sanitizeAnswers()])
    .then(function (res) {
      callback(null, {
        description: res[0],
        hints: res[1],
        categories: res[2],
        answers: res[3]
      })
    })
    .catch(function (err) {
      callback(err, null)
    })
}

router.post('/:taskId/update', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, getTask, urlencodedExtendedParser, function (request, response, next) {
  sanitizeUpdateTaskParams(request.body, request.task, function (err, taskParams) {
    if (err) {
      next(err)
    } else {
      const updateConstraints = {
        description: constraints.taskDescription,
        hints: constraints.taskHints,
        categories: constraints.taskCategories,
        answers: constraints.taskExtraAnswers
      }

      const validationResult = validator.validate(taskParams, updateConstraints)
      if (validationResult === true) {
        TaskController.update(request.task, taskParams, function (err, task) {
          if (err) {
            next(err)
          } else {
            response.json({ success: true })
          }
        })
      } else {
        logger.error(validationResult)
        next(new ValidationError())
      }
    }
  })
})

module.exports = router

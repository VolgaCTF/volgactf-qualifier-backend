import express from 'express'

import { checkToken } from '../middleware/security'
import { detectScope, needsToBeAuthorizedSupervisor, needsToBeAuthorizedTeam, needsToBeAuthorizedAdmin } from '../middleware/session'
import { getState, contestIsStarted, contestIsFinished, contestNotFinished } from '../middleware/contest'
import { getTask } from '../middleware/task'
import { getTeam } from '../middleware/team'

import constraints from '../utils/constraints'
import logger from '../utils/logger'

import bodyParser from 'body-parser'
import Validator from 'validator.js'
let validator = new Validator.Validator()
let urlencodedParser = bodyParser.urlencoded({ extended: false })
let urlencodedExtendedParser = bodyParser.urlencoded({ extended: true })

let router = express.Router()

import { InternalError, NotAuthenticatedError, TeamNotQualifiedError, TaskSubmitAttemptsLimitError, WrongTaskAnswerError, ValidationError, TaskNotAvailableError } from '../utils/errors'
import is_ from 'is_js'
import _ from 'underscore'

import TaskController from '../controllers/task'
import TaskCategoryController from '../controllers/task-category'
import TaskAnswerController from '../controllers/task-answer'
import TaskHintController from '../controllers/task-hint'
import TeamTaskHitController from '../controllers/team-task-hit'
import taskSerializer from '../serializers/task'
import taskCategorySerializer from '../serializers/task-category'
import taskAnswerSerializer from '../serializers/task-answer'
import taskHintSerializer from '../serializers/task-hint'
import constants from '../utils/constants'
import taskParam from '../params/task'
import TeamTaskHitAttemptController from '../controllers/team-task-hit-attempt'
import TeamTaskReviewController from '../controllers/team-task-review'
import teamTaskReviewSerializer from '../serializers/team-task-review'

import LimitController from '../controllers/limit'
import when_ from 'when'
import teamTaskHitSerializer from '../serializers/team-task-hit'

router.param('taskId', taskParam.id)

router.get('/index', detectScope, (request, response, next) => {
  TaskController.index((err, tasks) => {
    if (err) {
      logger.error(err)
      next(new InternalError())
    } else {
      let serializer = _.partial(taskSerializer, _, { preview: true })
      response.json(_.map(tasks, serializer))
    }
  }, !request.scope.isSupervisor())
})

router.get('/category/index', detectScope, (request, response, next) => {
  TaskController.index((err, tasks) => {
    if (err) {
      logger.error(err)
      next(new InternalError())
    } else {
      let taskIds = _.map(tasks, (task) => {
        return task.id
      })

      TaskCategoryController.indexByTasks(taskIds, (err, taskCategories) => {
        if (err) {
          next(err)
        } else {
          response.json(_.map(taskCategories, taskCategorySerializer))
        }
      })
    }
  }, !request.scope.isSupervisor())
})

router.get('/:taskId/category', detectScope, getTask, (request, response, next) => {
  if (request.task.isInitial() && (request.scope.isGuest() || request.scope.isTeam())) {
    throw new NotAuthenticatedError()
  } else {
    TaskCategoryController.indexByTask(request.task.id, (err, taskCategories) => {
      if (err) {
        next(err)
      } else {
        response.json(_.map(taskCategories, taskCategorySerializer))
      }
    })
  }
})

router.get('/:taskId/answer', needsToBeAuthorizedAdmin, (request, response, next) => {
  TaskAnswerController.listByTask(request.taskId, (err, taskAnswers) => {
    if (err) {
      next(err)
    } else {
      response.json(taskAnswers.map(taskAnswerSerializer))
    }
  })
})

router.get('/:taskId/hint', detectScope, getTask, getState, (request, response, next) => {
  let guestsEligible = (request.scope.isGuest() && request.contest && request.contest.isFinished() && request.task.isOpened())
  let teamsEligible = (request.scope.isTeam() && request.contest && !request.contest.isInitial() && request.task.isOpened())
  let supervisorsEligible = request.scope.isSupervisor()

  if (!guestsEligible && !teamsEligible && !supervisorsEligible) {
    throw new NotAuthenticatedError()
  }

  TaskHintController.listByTask(request.task.id, (err, taskHints) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(taskHints, taskHintSerializer))
    }
  })
})

router.get('/hit/index', needsToBeAuthorizedSupervisor, (request, response, next) => {
  TeamTaskHitController.list((err, teamTaskHits) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(teamTaskHits, teamTaskHitSerializer))
    }
  })
})

router.get('/:taskId/hit/statistics', detectScope, (request, response, next) => {
  if (!request.scope.isTeam() && !request.scope.isSupervisor()) {
    throw new NotAuthenticatedError()
  }

  TeamTaskHitController.listForTask(request.taskId, (err, teamTaskHits) => {
    if (err) {
      next(err)
    } else {
      response.json({
        count: teamTaskHits.length
      })
    }
  })
})

router.get('/:taskId/hit/index', needsToBeAuthorizedSupervisor, (request, response, next) => {
  TeamTaskHitController.listForTask(request.taskId, (err, teamTaskHits) => {
    if (err) {
      next(err)
    } else {
      response.json(teamTaskHits.map(teamTaskHitSerializer))
    }
  })
})

router.get('/:taskId', detectScope, getState, getTask, (request, response, next) => {
  let guestsEligible = (request.scope.isGuest() && request.contest && request.contest.isFinished() && request.task.isOpened())
  let teamsEligible = (request.scope.isTeam() && request.contest && !request.contest.isInitial() && request.task.isOpened())
  let supervisorsEligible = request.scope.isSupervisor()

  if (!(guestsEligible || teamsEligible || supervisorsEligible)) {
    throw new NotAuthenticatedError()
  }

  response.json(taskSerializer(request.task))
})

router.get('/:taskId/review/index', detectScope, getTask, (request, response, next) => {
  if (!request.scope.isTeam() && !request.scope.isSupervisor()) {
    throw new NotAuthenticatedError()
  }

  if (request.scope.isTeam()) {
    TeamTaskReviewController.indexByTeamAndTask(request.session.identityID, request.task.id, (err, teamTaskReviews) => {
      if (err) {
        next(err)
      } else {
        response.json(_.map(teamTaskReviews, teamTaskReviewSerializer))
      }
    })
  } else if (request.scope.isSupervisor()) {
    TeamTaskReviewController.indexByTask(request.task.id, (err, teamTaskReviews) => {
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

router.get('/:taskId/review/statistics', needsToBeAuthorizedTeam, getTask, (request, response, next) => {
  TeamTaskReviewController.indexByTask(request.task.id, (err, teamTaskReviews) => {
    if (err) {
      next(err)
    } else {
      let ratingList = _.map(teamTaskReviews, (teamTaskReview) => {
        return teamTaskReview.rating
      })

      let averageRating = _.reduce(ratingList, (memo, rating) => {
        return memo + rating
      }, 0) / (ratingList.length === 0 ? 1 : ratingList.length)

      response.json({
        reviewCount: teamTaskReviews.length,
        reviewAverageRating: averageRating
      })
    }
  })
})

function sanitizeReviewTaskParams (params, callback) {
  let sanitizeRating = function () {
    let deferred = when_.defer()
    let value = parseInt(params.rating, 10)
    if (is_.number(value)) {
      deferred.resolve(value)
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  let sanitizeComment = function () {
    let deferred = when_.defer()
    deferred.resolve(params.comment)
    return deferred.promise
  }

  when_
    .all([sanitizeRating(), sanitizeComment()])
    .then((res) => {
      callback(null, {
        rating: res[0],
        comment: res[1]
      })
    })
    .catch((err) => {
      logger.error(err)
      callback(err, null)
    })
}

router.post('/:taskId/review', needsToBeAuthorizedTeam, contestIsStarted, checkToken, getTask, getTeam, urlencodedParser, (request, response, next) => {
  if (!request.team.isQualified()) {
    throw new TeamNotQualifiedError()
  }

  sanitizeReviewTaskParams(request.body, (err, reviewParams) => {
    if (err) {
      next(err)
    } else {
      let createConstraints = {
        rating: constraints.reviewRating,
        comment: constraints.reviewComment
      }

      let validationResult = validator.validate(reviewParams, createConstraints)
      if (validationResult === true) {
        TeamTaskReviewController.create(request.team.id, request.task.id, reviewParams.rating, reviewParams.comment, (err, teamTaskReview) => {
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

router.post('/:taskId/submit', needsToBeAuthorizedTeam, contestIsStarted, checkToken, getTask, getTeam, urlencodedParser, (request, response, next) => {
  if (!request.team.isQualified()) {
    throw new TeamNotQualifiedError()
  }

  if (!request.task.isOpened()) {
    throw new TaskNotAvailableError()
  }

  let limiter = new LimitController(`themis__team${request.session.identityID}__task${request.taskId}__submit`, {
    timeout: constants.TASK_SUBMIT_LIMIT_TIME,
    maxAttempts: constants.TASK_SUBMIT_LIMIT_ATTEMPTS
  })

  limiter.check((err, limitExceeded) => {
    if (err) {
      next(err)
    } else {
      if (limitExceeded) {
        next(new TaskSubmitAttemptsLimitError())
      } else {
        let submitConstraints = {
          answer: constraints.taskAnswer
        }

        let validationResult = validator.validate(request.body, submitConstraints)
        if (validationResult === true) {
          TaskController.checkAnswer(request.task, request.body.answer, (err, checkResult) => {
            if (err) {
              next(err)
            } else {
              if (checkResult) {
                TeamTaskHitController.create(request.session.identityID, request.task, (err, teamTaskHit) => {
                  if (err) {
                    next(err)
                  } else {
                    response.json({ success: true })
                  }
                })
              } else {
                next(new WrongTaskAnswerError())
                TeamTaskHitAttemptController.create(request.session.identityID, request.task.id, request.body.answer, (err, teamTaskHitAttempt) => {
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

router.post('/:taskId/revise', checkToken, needsToBeAuthorizedSupervisor, getTask, urlencodedParser, (request, response, next) => {
  let reviseConstraints = {
    answer: constraints.taskAnswer
  }

  let validationResult = validator.validate(request.body, reviseConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TaskController.checkAnswer(request.task, request.body.answer, (err, checkResult) => {
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

router.post('/:taskId/check', detectScope, checkToken, contestIsFinished, getTask, urlencodedParser, (request, response, next) => {
  if (!request.scope.isGuest() && !request.scope.isTeam()) {
    throw new InternalError()
  }

  if (!request.task.isOpened()) {
    throw new TaskNotAvailableError()
  }

  let checkConstraints = {
    answer: constraints.taskAnswer
  }

  let validationResult = validator.validate(request.body, checkConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TaskController.checkAnswer(request.task, request.body.answer, (err, checkResult) => {
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

router.post('/:taskId/open', contestIsStarted, checkToken, needsToBeAuthorizedAdmin, getTask, (request, response, next) => {
  TaskController.open(request.task, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/:taskId/close', contestIsStarted, checkToken, needsToBeAuthorizedAdmin, getTask, (request, response, next) => {
  TaskController.close(request.task, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

function sanitizeCreateTaskParams (params, callback) {
  let sanitizeTitle = function () {
    let deferred = when_.defer()
    deferred.resolve(params.title)
    return deferred.promise
  }

  let sanitizeDescription = function () {
    let deferred = when_.defer()
    deferred.resolve(params.description)
    return deferred.promise
  }

  let sanitizeHints = function () {
    let deferred = when_.defer()
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

  let sanitizeValue = function () {
    let deferred = when_.defer()
    let value = parseInt(params.value, 10)
    if (is_.number(value)) {
      deferred.resolve(value)
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  let sanitizeCategories = function () {
    let deferred = when_.defer()
    let categories = params.categories
    if (!categories) {
      categories = []
    }
    if (is_.string(categories)) {
      categories = [categories]
    }

    if (is_.array(categories)) {
      let valCategories = []
      for (let valCategoryStr of categories) {
        let valCategory = parseInt(valCategoryStr, 10)
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

  let sanitizeAnswers = function () {
    let deferred = when_.defer()
    let answers = params.answers
    if (!answers) {
      answers = []
    }

    if (is_.array(answers)) {
      deferred.resolve(_.map(answers, (entry) => {
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
    .then((res) => {
      callback(null, {
        title: res[0],
        description: res[1],
        hints: res[2],
        value: res[3],
        categories: res[4],
        answers: res[5]
      })
    })
    .catch((err) => {
      logger.error(err)
      callback(err, null)
    })
}

router.post('/create', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedExtendedParser, (request, response, next) => {
  sanitizeCreateTaskParams(request.body, (err, taskParams) => {
    if (err) {
      next(err)
    } else {
      let createConstraints = {
        title: constraints.taskTitle,
        description: constraints.taskDescription,
        hints: constraints.taskHints,
        value: constraints.taskValue,
        categories: constraints.taskCategories,
        answers: constraints.taskAnswers
      }

      let validationResult = validator.validate(taskParams, createConstraints)
      if (validationResult === true) {
        TaskController.create(taskParams, (err, task) => {
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
  let sanitizeDescription = function () {
    let deferred = when_.defer()
    deferred.resolve(params.description)
    return deferred.promise
  }

  let sanitizeHints = function () {
    let deferred = when_.defer()
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

  let sanitizeCategories = function () {
    let deferred = when_.defer()
    let categories = params.categories
    if (!categories) {
      categories = []
    }
    if (is_.string(categories)) {
      categories = [categories]
    }

    if (is_.array(categories)) {
      let valCategories = []
      for (let valCategoryStr of categories) {
        let valCategory = parseInt(valCategoryStr, 10)
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

  let sanitizeAnswers = function () {
    let deferred = when_.defer()
    let answers = params.answers
    if (!answers) {
      answers = []
    }

    if (is_.array(answers)) {
      deferred.resolve(_.map(answers, (entry) => {
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
    .then((res) => {
      callback(null, {
        description: res[0],
        hints: res[1],
        categories: res[2],
        answers: res[3]
      })
    })
    .catch((err) => {
      callback(err, null)
    })
}

router.post('/:taskId/update', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, getTask, urlencodedExtendedParser, (request, response, next) => {
  sanitizeUpdateTaskParams(request.body, request.task, (err, taskParams) => {
    if (err) {
      next(err)
    } else {
      let updateConstraints = {
        description: constraints.taskDescription,
        hints: constraints.taskHints,
        categories: constraints.taskCategories,
        answers: constraints.taskExtraAnswers
      }

      let validationResult = validator.validate(taskParams, updateConstraints)
      if (validationResult === true) {
        TaskController.update(request.task, taskParams, (err, task) => {
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

export default router

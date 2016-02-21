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

import { InternalError, NotAuthenticatedError, EmailNotConfirmedError, TaskSubmitAttemptsLimitError, WrongTaskAnswerError, ValidationError } from '../utils/errors'
import is_ from 'is_js'
import _ from 'underscore'

import TaskController from '../controllers/task'
import TaskCategoryController from '../controllers/task-category'
import TaskAnswerController from '../controllers/task-answer'
import TeamTaskHitController from '../controllers/team-task-hit'
import taskSerializer from '../serializers/task'
import taskCategorySerializer from '../serializers/task-category'
import taskAnswerSerializer from '../serializers/task-answer'
import constants from '../utils/constants'
import taskParam from '../params/task'

import LimitController from '../controllers/limit'
import when_ from 'when'
import LogController from '../controllers/log'

router.param('taskId', taskParam.id)

router.get('/all', detectScope, (request, response, next) => {
  let onFetch = (exposeEmail) => {
    let serializer = _.partial(taskSerializer, _, { preview: true })
    return (err, tasks) => {
      if (err) {
        logger.error(err)
        next(new InternalError())
      } else {
        response.json(_.map(tasks, serializer))
      }
    }
  }

  if (request.scope === 'supervisors') {
    TaskController.list(onFetch(true))
  } else {
    TaskController.listEligible(onFetch(false))
  }
})

router.get('/category/all', detectScope, (request, response, next) => {
  // TODO: Take scope into account
  TaskCategoryController.list((err, taskCategories) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(taskCategories, taskCategorySerializer))
    }
  })
})

router.get('/:taskId/category', detectScope, getState, (request, response, next) => {
  let guestsEligible = (request.scope === 'guests' && request.contest && request.contest.isFinished())
  let teamsEligible = (request.scope === 'teams' && request.contest && !request.contest.isInitial())
  let supervisorsEligible = (request.scope === 'supervisors')

  if (!guestsEligible && !teamsEligible && !supervisorsEligible) {
    throw new NotAuthenticatedError()
  }

  TaskController.get(request.taskId, (err, task) => {
    if (err) {
      next(err)
    } else {
      if (request.scope === 'teams' && task.isInitial()) {
        throw new NotAuthenticatedError()
      } else {
        TaskCategoryController.listByTask(task.id, (err, taskCategories) => {
          if (err) {
            next(err)
          } else {
            response.json(_.map(taskCategories, taskCategorySerializer))
          }
        })
      }
    }
  })
})

router.get('/:taskId/answer', needsToBeAuthorizedSupervisor, (request, response, next) => {
  TaskAnswerController.listByTask(request.taskId, (err, taskAnswers) => {
    if (err) {
      next(err)
    } else {
      response.json(taskAnswers.map(taskAnswerSerializer))
    }
  })
})

router.get('/:taskId', detectScope, getState, (request, response, next) => {
  let guestsEligible = (request.scope === 'guests' && request.contest && request.contest.isFinished())
  let teamsEligible = (request.scope === 'teams' && request.contest && !request.contest.isInitial())
  let supervisorsEligible = (request.scope === 'supervisors')

  if (!(guestsEligible || teamsEligible || supervisorsEligible)) {
    throw new NotAuthenticatedError()
  }

  TaskController.get(request.taskId, (err, task) => {
    if (err) {
      next(err)
    } else {
      if (request.scope === 'teams' && !task.isOpened()) {
        next(new NotAuthenticatedError())
      } else {
        response.json(taskSerializer(task))
      }
    }
  })
})

router.post('/:taskId/submit', needsToBeAuthorizedTeam, contestIsStarted, checkToken, getTask, getTeam, urlencodedParser, (request, response, next) => {
  if (!request.team.emailConfirmed) {
    throw new EmailNotConfirmedError()
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
        if (validationResult) {
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
                    LogController.pushLog(constants.LOG_TEAM_TASK_SUBMIT_SUCCESS, {
                      teamId: request.session.identityID,
                      taskId: request.taskId
                    })
                  }
                })
              } else {
                next(new WrongTaskAnswerError())
                LogController.pushLog(constants.LOG_TEAM_TASK_SUBMIT_ERROR, {
                  teamId: request.session.identityID,
                  taskId: request.taskId,
                  answer: request.body.answer
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
  if (!validationResult) {
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

router.post('/:taskId/check', checkToken, detectScope, contestIsFinished, getTask, urlencodedParser, (request, response, next) => {
  if (!_.contains(['guests', 'teams'], request.scope)) {
    throw new InternalError()
  }

  let checkConstraints = {
    answer: constraints.taskAnswer
  }

  let validationResult = validator.validate(request.body, checkConstraints)
  if (!validationResult) {
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
      deferred.resolve(_.map(answers), (entry) => {
        return {
          answer: entry.answer,
          caseSensitive: entry.caseSensitive === 'true'
        }
      })
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
      if (validationResult) {
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
      deferred.resolve(_.map(answers), (entry) => {
        return {
          answer: entry.answer,
          caseSensitive: entry.caseSensitive === 'true'
        }
      })
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
        answers: constraints.taskAnswers
      }

      let validationResult = validator.validate(taskParams, updateConstraints)
      if (validationResult) {
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

const express = require('express')

const { checkToken } = require('../middleware/security')
const { detectScope, needsToBeAuthorizedSupervisor, needsToBeAuthorizedTeam, needsToBeAuthorizedAdmin } = require('../middleware/session')
const { getContest, contestIsStarted, contestIsFinished, contestNotFinished } = require('../middleware/contest')
const { getTask } = require('../middleware/task')
const { getTeam } = require('../middleware/team')
const { getTaskFile } = require('../middleware/task-file')

const constraints = require('../utils/constraints')
const logger = require('../utils/logger')

const bodyParser = require('body-parser')
const Validator = require('validator.js')
const validator = new Validator.Validator()
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const urlencodedExtendedParser = bodyParser.urlencoded({ extended: true })

const router = express.Router()

const {
  InternalError, NotAuthenticatedError, TeamNotQualifiedError, TaskSubmitAttemptsLimitError,
  WrongTaskAnswerError, ValidationError, TaskNotAvailableError
} = require('../utils/errors')
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

const busboy = require('connect-busboy')
const tmp = require('tmp')
const fs = require('fs')
const taskFileController = require('../controllers/task-file')
const taskFileSerializer = require('../serializers/task-file')

const taskFileParam = require('../params/task-file')

const supervisorTaskSubscriptionController = require('../controllers/supervisor-task-subscription')
const gitHubController = require('../controllers/github')
const gitFlicController = require('../controllers/gitflic')
const CategoryController = require('../controllers/category')

router.param('taskId', taskParam.id)
router.param('taskFileId', taskFileParam.id)

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

router.get('/github-repository/index', needsToBeAuthorizedAdmin, function (request, response, next) {
  gitHubController
    .listRepositories()
    .then(function (repositories) {
      response.json(repositories)
    })
    .catch(function (err) {
      next(err)
    })
})

router.get('/gitflic-repository/index', needsToBeAuthorizedAdmin, function (request, response, next) {
  gitFlicController
    .listRepositories()
    .then(function (repositories) {
      response.json(repositories)
    })
    .catch(function (err) {
      next(err)
    })
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

router.get('/:taskId/hint', detectScope, getTask, getContest, function (request, response, next) {
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

router.get('/:taskId', detectScope, getContest, getTask, function (request, response, next) {
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
        averageRating
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

  const limiter = new LimitController(`volgactf_qualifier__team${request.session.identityID}__task${request.taskId}__submit`, {
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

router.post('/:taskId/subscribe', checkToken, needsToBeAuthorizedSupervisor, getTask, function (request, response, next) {
  supervisorTaskSubscriptionController
    .create(request.session.identityID, request.task)
    .then(function (supervisorTaskSubscription) {
      response.json({ success: true })
    })
    .catch(function (err) {
      next(err)
    })
})

router.post('/:taskId/unsubscribe', checkToken, needsToBeAuthorizedSupervisor, getTask, function (request, response, next) {
  supervisorTaskSubscriptionController
    .delete(request.session.identityID, request.task)
    .then(function () {
      response.json({ success: true })
    })
    .catch(function (err) {
      next(err)
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

  const sanitizeCheckMethod = function () {
    const deferred = when_.defer()
    deferred.resolve(params.checkMethod)
    return deferred.promise
  }

  const sanitizeAnswers = function () {
    const deferred = when_.defer()
    let answers = params.answers
    if (!answers) {
      answers = []
    }

    if (is_.array(answers)) {
      if (params.checkMethod === 'list') {
        deferred.resolve(_.map(answers, function (entry) {
          return {
            answer: entry.answer,
            caseSensitive: entry.caseSensitive === 'true'
          }
        }))
      } else {
        deferred.resolve([])
      }
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  const sanitizeRemoteChecker = function () {
    const deferred = when_.defer()
    if (params.checkMethod === 'remote') {
      const value = parseInt(params.remoteChecker, 10)
      if (is_.number(value)) {
        deferred.resolve(value)
      } else {
        deferred.reject(new ValidationError())
      }
    } else {
      deferred.resolve(-1)
    }
    return deferred.promise
  }

  const sanitizeRewardScheme = function () {
    const deferred = when_.defer()
    deferred.resolve(params.rewardScheme)
    return deferred.promise
  }

  const sanitizeMaxValue = function () {
    const deferred = when_.defer()
    if (params.rewardScheme === 'fixed' || params.rewardScheme === 'variable') {
      const value = parseInt(params.reward.maxValue, 10)
      if (is_.number(value)) {
        deferred.resolve(value)
      } else {
        deferred.reject(new ValidationError())
      }
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  const sanitizeMinValue = function () {
    const deferred = when_.defer()
    if (params.rewardScheme === 'variable') {
      const value = parseInt(params.reward.minValue, 10)
      if (is_.number(value)) {
        deferred.resolve(value)
      } else {
        deferred.reject(new ValidationError())
      }
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  const sanitizeSubtractPoints = function () {
    const deferred = when_.defer()
    if (params.rewardScheme === 'variable') {
      const value = parseInt(params.reward.subtractPoints, 10)
      if (is_.number(value)) {
        deferred.resolve(value)
      } else {
        deferred.reject(new ValidationError())
      }
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  const sanitizeSubtractHitCount = function () {
    const deferred = when_.defer()
    if (params.rewardScheme === 'variable') {
      const value = parseInt(params.reward.subtractHitCount, 10)
      if (is_.number(value)) {
        deferred.resolve(value)
      } else {
        deferred.reject(new ValidationError())
      }
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  const sanitizeOpenAt = function () {
    const deferred = when_.defer()
    const value = parseInt(params.openAt, 10)
    if (_.isFinite(value)) {
      deferred.resolve(new Date(value))
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  when_
    .all([
      sanitizeTitle(),
      sanitizeDescription(),
      sanitizeHints(),
      sanitizeCategories(),
      sanitizeCheckMethod(),
      sanitizeAnswers(),
      sanitizeRemoteChecker(),
      sanitizeRewardScheme(),
      sanitizeMaxValue(),
      sanitizeMinValue(),
      sanitizeSubtractPoints(),
      sanitizeSubtractHitCount(),
      sanitizeOpenAt()
    ])
    .then(function (res) {
      callback(null, {
        title: res[0],
        description: res[1],
        hints: res[2],
        categories: res[3],
        checkMethod: res[4],
        answers: res[5],
        remoteChecker: res[6],
        rewardScheme: res[7],
        maxValue: res[8],
        minValue: res[9],
        subtractPoints: res[10],
        subtractHitCount: res[11],
        openAt: res[12]
      })
    })
    .catch(function (err) {
      logger.error(err)
      callback(err, null)
    })
}

function createTaskFromPayload (payload) {
  return new Promise(function (resolve, reject) {
    sanitizeCreateTaskParams(payload, function (err, taskParams) {
      if (err) {
        reject(err)
      } else {
        const createConstraints = {
          title: constraints.taskTitle,
          description: constraints.taskDescription,
          hints: constraints.taskHints,
          categories: constraints.taskCategories,
          rewardScheme: constraints.taskRewardScheme,
          checkMethod: constraints.taskCheckMethod,
          openAt: constraints.taskOpenAt
        }

        if (taskParams.checkMethod === 'list') {
          createConstraints.answers = constraints.taskAnswers
        } else if (taskParams.checkMethod === 'remote') {
          createConstraints.remoteChecker = constraints.remoteCheckerId
        }

        if (taskParams.rewardScheme === 'fixed') {
          createConstraints.maxValue = constraints.taskValue
        } else if (taskParams.rewardScheme === 'variable') {
          createConstraints.maxValue = constraints.taskValue
          createConstraints.minValue = constraints.taskValue
          createConstraints.subtractPoints = constraints.taskSubtractPoints
          createConstraints.subtractHitCount = constraints.taskSubtractHitCount
        }
        const validationResult = validator.validate(taskParams, createConstraints)
        if (validationResult === true) {
          TaskController.create(taskParams, function (err, task) {
            if (err) {
              reject(err)
            } else {
              resolve(task)
            }
          })
        } else {
          logger.error(JSON.stringify(validationResult))
          reject(new ValidationError())
        }
      }
    })
  })
}

router.post('/create', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedExtendedParser, function (request, response, next) {
  createTaskFromPayload(request.body)
    .then(function (task) {
      response.json({ success: true })
    })
    .catch(function (err) {
      next(err)
    })
})

function preprocessTaskConfigFromVcsRepository (taskConfig) {
  const resolveCategory = function (categoryTitle) {
    const deferred = when_.defer()

    CategoryController
      .getByTitle(categoryTitle)
      .then(function (category) {
        if (category === null) {
          CategoryController
            .create(categoryTitle, '', function (err, newCategory) {
              if (err) {
                logger.error(err)
                deferred.resolve(null)
              } else {
                deferred.resolve({ type: 'category', id: newCategory.id })
              }
            })
        } else {
          deferred.resolve({ type: 'category', id: category.id })
        }
      })
      .catch(function (err) {
        logger.error(err)
        deferred.resolve(null)
      })

    return deferred.promise
  }

  return new Promise(function (resolve, reject) {
    const propResolvers = []

    if (Object.hasOwn(taskConfig, 'categories')) {
      const categoryResolvers = _.map(taskConfig.categories, function (categoryTitle) {
        return resolveCategory(categoryTitle)
      })
      propResolvers.push(...categoryResolvers)
    }

    when_
      .all(propResolvers)
      .then(function (propResolved) {
        const params = {
          title: taskConfig.title,
          description: taskConfig.description,
          hints: [],
          categories: _.map(
            _.filter(propResolved, function (propResolvedItem) {
              return propResolvedItem && propResolvedItem.type === 'category'
            }),
            function (categoryResolvedItem) {
              return categoryResolvedItem.id
            }
          ),
          checkMethod: 'list',
          answers: _.map(taskConfig.answers, function (answer) {
            if (is_.string(answer)) {
              return { answer, caseSensitive: 'true' }
            } else if (Object.hasOwn(answer, 'answer') && Object.hasOwn(answer, 'case_sensitive')) {
              return { answer: answer.answer, caseSensitive: answer.case_sensitive.toString() }
            }
          }),
          remoteChecker: -1,
          openAt: null
        }

        if (Object.hasOwn(taskConfig, 'scoring') && Object.hasOwn(taskConfig.scoring, 'type')) {
          if (taskConfig.scoring.type === 'static' && Object.hasOwn(taskConfig.scoring, 'value')) {
            params.rewardScheme = 'fixed'
            params.reward = {
              maxValue: taskConfig.scoring.value
            }
          } else if (taskConfig.scoring.type === 'dyn_log') {
            params.rewardScheme = 'dynlog'
          } else if (taskConfig.scoring.type === 'dyn_lin' && Object.hasOwn(taskConfig.scoring, 'max_value') && Object.hasOwn(taskConfig.scoring, 'min_value') && Object.hasOwn(taskConfig.scoring, 'subtract_points') && Object.hasOwn(taskConfig.scoring, 'subtract_hit_count')) {
            params.rewardScheme = 'variable'
            params.reward = {
              maxValue: taskConfig.scoring.max_value,
              minValue: taskConfig.scoring.min_value,
              subtractPoints: taskConfig.scoring.subtract_points,
              subtractHitCount: taskConfig.scoring.subtract_hit_count
            }
          }
        }

        resolve(params)
      })
      .catch(function (err) {
        reject(err)
      })
  })
}

router.post('/create-from-github', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, function (request, response, next) {
  TaskController
    .loadFromGitHub(request.body.repository)
    .then(function (taskConfig) {
      return preprocessTaskConfigFromVcsRepository(taskConfig)
    })
    .then(function (taskParams) {
      return createTaskFromPayload(taskParams)
    })
    .then(function (task) {
      return TaskController
        .loadFilesFromGitHubAndUpdateDescription(task, request.body.repository)
    })
    .then(function (updatedTask) {
      response.json({ success: true })
    })
    .catch(function (err) {
      next(err)
    })
})

router.post('/create-from-gitflic', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, function (request, response, next) {
  TaskController
    .loadFromGitFlic(request.body.repository)
    .then(function (taskConfig) {
      return preprocessTaskConfigFromVcsRepository(taskConfig)
    })
    .then(function (taskParams) {
      return createTaskFromPayload(taskParams)
    })
    .then(function (task) {
      return TaskController
        .loadFilesFromGitFlicAndUpdateDescription(task, request.body.repository)
    })
    .then(function (updatedTask) {
      response.json({ success: true })
    })
    .catch(function (err) {
      next(err)
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

  const sanitizeCheckMethod = function () {
    const deferred = when_.defer()
    deferred.resolve(params.checkMethod)
    return deferred.promise
  }

  const sanitizeAnswers = function () {
    const deferred = when_.defer()
    let answers = params.answers
    if (!answers) {
      answers = []
    }

    if (is_.array(answers)) {
      if (params.checkMethod === 'list') {
        deferred.resolve(_.map(answers, function (entry) {
          return {
            answer: entry.answer,
            caseSensitive: entry.caseSensitive === 'true'
          }
        }))
      } else {
        deferred.resolve([])
      }
    } else {
      deferred.reject(new ValidationError())
    }

    return deferred.promise
  }

  const sanitizeRewardScheme = function () {
    const deferred = when_.defer()
    deferred.resolve(params.rewardScheme)
    return deferred.promise
  }

  const sanitizeMaxValue = function () {
    const deferred = when_.defer()
    if (params.rewardScheme === 'fixed' || params.rewardScheme === 'variable') {
      const value = parseInt(params.reward.maxValue, 10)
      if (is_.number(value)) {
        deferred.resolve(value)
      } else {
        deferred.reject(new ValidationError())
      }
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  const sanitizeMinValue = function () {
    const deferred = when_.defer()
    if (params.rewardScheme === 'variable') {
      const value = parseInt(params.reward.minValue, 10)
      if (is_.number(value)) {
        deferred.resolve(value)
      } else {
        deferred.reject(new ValidationError())
      }
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  const sanitizeSubtractPoints = function () {
    const deferred = when_.defer()
    if (params.rewardScheme === 'variable') {
      const value = parseInt(params.reward.subtractPoints, 10)
      if (is_.number(value)) {
        deferred.resolve(value)
      } else {
        deferred.reject(new ValidationError())
      }
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  const sanitizeSubtractHitCount = function () {
    const deferred = when_.defer()
    if (params.rewardScheme === 'variable') {
      const value = parseInt(params.reward.subtractHitCount, 10)
      if (is_.number(value)) {
        deferred.resolve(value)
      } else {
        deferred.reject(new ValidationError())
      }
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  const sanitizeOpenAt = function () {
    const deferred = when_.defer()
    const value = parseInt(params.openAt, 10)
    if (_.isFinite(value)) {
      deferred.resolve(new Date(value))
    } else {
      deferred.resolve(null)
    }

    return deferred.promise
  }

  when_
    .all([
      sanitizeDescription(),
      sanitizeHints(),
      sanitizeCategories(),
      sanitizeCheckMethod(),
      sanitizeAnswers(),
      sanitizeRewardScheme(),
      sanitizeMaxValue(),
      sanitizeMinValue(),
      sanitizeSubtractPoints(),
      sanitizeSubtractHitCount(),
      sanitizeOpenAt()
    ])
    .then(function (res) {
      callback(null, {
        description: res[0],
        hints: res[1],
        categories: res[2],
        checkMethod: res[3],
        answers: res[4],
        rewardScheme: res[5],
        maxValue: res[6],
        minValue: res[7],
        subtractPoints: res[8],
        subtractHitCount: res[9],
        openAt: res[10]
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
        rewardScheme: constraints.taskRewardScheme,
        checkMethod: constraints.taskCheckMethod,
        openAt: constraints.taskOpenAt
      }

      if (taskParams.checkMethod === 'list') {
        updateConstraints.answers = constraints.taskExtraAnswers
      }

      if (taskParams.rewardScheme === 'fixed') {
        updateConstraints.maxValue = constraints.taskValue
      } else if (taskParams.rewardScheme === 'variable') {
        updateConstraints.maxValue = constraints.taskValue
        updateConstraints.minValue = constraints.taskValue
        updateConstraints.subtractPoints = constraints.taskSubtractPoints
        updateConstraints.subtractHitCount = constraints.taskSubtractHitCount
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

const multidataParser = busboy({
  immediate: true,
  limits: {
    fieldSize: 256,
    fields: 10,
    fileSize: parseInt(process.env.VOLGACTF_QUALIFIER_POST_MAX_TASK_FILE_SIZE, 10) * 1024 * 1024,
    files: 1
  }
})

router.get('/:taskId/file/index', needsToBeAuthorizedAdmin, getTask, function (request, response, next) {
  taskFileController
    .fetchByTask(request.task.id)
    .then(function (taskFiles) {
      response.json(taskFiles.map(taskFileSerializer))
    })
    .catch(function (err) {
      next(err)
    })
})

router.post('/:taskId/file/create', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, getTask, multidataParser, function (request, response, next) {
  const taskFileMetadata = {}
  const taskFile = tmp.fileSync({
    mode: 0o666,
    dir: process.env.VOLGACTF_QUALIFIER_UPLOAD_TMP_DIR,
    keep: true
  })

  request.busboy.on('file', function (fieldName, file, filename, encoding, mimetype) {
    file.on('data', function (data) {
      if (fieldName === 'uploadFile') {
        fs.appendFileSync(taskFile.name, data)
      }
    })
  })

  request.busboy.on('field', function (fieldName, val, fieldNameTruncated, valTruncated) {
    if (fieldName === 'uploadName') {
      taskFileMetadata[fieldName] = val
    }
  })

  request.busboy.on('finish', function () {
    const uploadConstraints = {
      uploadName: constraints.uploadName
    }

    const validationResult = validator.validate(taskFileMetadata, uploadConstraints)
    if (validationResult === true) {
      taskFileController
        .create(request.task.id, taskFile.name, taskFileMetadata.uploadName)
        .then(function (taskFile) {
          response.json({ success: true })
        })
        .catch(function (err) {
          next(err)
        })
    } else {
      next(new ValidationError())
    }
  })
})

router.post('/:taskId/file/:taskFileId/delete', needsToBeAuthorizedAdmin, getTaskFile, function (request, response, next) {
  if (request.taskFile.taskId !== request.taskId) {
    next(new ValidationError())
  } else {
    taskFileController
      .delete(request.taskFile)
      .then(function () {
        response.json({ success: true })
      })
      .catch(function (err) {
        next(err)
      })
  }
})

module.exports = router

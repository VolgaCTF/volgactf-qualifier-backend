const express = require('express')
const bodyParser = require('body-parser')
const busboy = require('connect-busboy')
const logger = require('../utils/logger')
const constraints = require('../utils/constraints')
const tmp = require('tmp')
const fs = require('fs')
const gm = require('gm')
const path = require('path')

const TeamController = require('../controllers/team')
const Validator = require('validator.js')
const validator = new Validator.Validator()
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const { InternalError, ValidationError, InvalidImageError, ImageDimensionsError, ImageAspectRatioError, NotAuthenticatedError } = require('../utils/errors')
const _ = require('underscore')
const is_ = require('is_js')

const { detectScope, needsToBeUnauthorized, needsToBeAuthorizedTeam } = require('../middleware/session')
const { checkToken } = require('../middleware/security')
const { contestNotFinished } = require('../middleware/contest')

const teamSerializer = require('../serializers/team')

const teamParam = require('../params/team')
const { getTeam } = require('../middleware/team')
const EventController = require('../controllers/event')
const LogoutTeamEvent = require('../events/logout-team')
const { SCOPE_TEAM } = require('../utils/constants')
const TeamTaskHitController = require('../controllers/team-task-hit')
const teamTaskHitSerializer = require('../serializers/team-task-hit')
const TeamTaskReviewController = require('../controllers/team-task-review')
const teamTaskReviewSerializer = require('../serializers/team-task-review')

const teamRankingController = require('../controllers/team-ranking')
const teamRankingSerializer = require('../serializers/team-ranking')

const emailAddressValidator = require('../controllers/email-address-validator')

const router = express.Router()

router.get('/index', detectScope, function (request, response, next) {
  TeamController.index(function (err, teams) {
    if (err) {
      logger.error(err)
      next(new InternalError())
    } else {
      const serializer = _.partial(teamSerializer, _, { exposeEmail: request.scope.isSupervisor() })
      response.json(_.map(teams, serializer))
    }
  }, !request.scope.isSupervisor())
})

router.get('/ranking/index', detectScope, function (request, response, next) {
  teamRankingController
  .fetch()
  .then(function (teamRankings) {
    response.json(teamRankings.map(teamRankingSerializer))
  })
  .catch(function (err) {
    logger.error(err)
    next(new InternalError())
  })
})

router.param('teamId', teamParam.id)

router.get('/:teamId/hit/index', detectScope, function (request, response, next) {
  if (!(request.scope.isTeam() && request.session.identityID === request.teamId) && !request.scope.isSupervisor()) {
    throw new NotAuthenticatedError()
  }

  TeamTaskHitController.listForTeam(request.teamId, function (err, teamTaskHits) {
    if (err) {
      next(err)
    } else {
      response.json(teamTaskHits.map(teamTaskHitSerializer))
    }
  })
})

router.get('/:teamId/hit/statistics', function (request, response, next) {
  TeamTaskHitController.listForTeam(request.teamId, function (err, teamTaskHits) {
    if (err) {
      next(err)
    } else {
      response.json({
        count: teamTaskHits.length
      })
    }
  })
})

router.get('/:teamId/review/index', detectScope, function (request, response, next) {
  if (!(request.scope.isTeam() && request.session.identityID === request.teamId) && !request.scope.isSupervisor()) {
    throw new NotAuthenticatedError()
  }

  TeamTaskReviewController.indexByTeam(request.teamId, function (err, teamTaskReviews) {
    if (err) {
      next(err)
    } else {
      response.json(teamTaskReviews.map(teamTaskReviewSerializer))
    }
  })
})

router.get('/:teamId/review/statistics', function (request, response, next) {
  TeamTaskReviewController.indexByTeam(request.teamId, function (err, teamTaskReviews) {
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

router.get('/:teamId/logo', function (request, response) {
  TeamController.get(request.teamId, function (err, team) {
    if (team) {
      const filename = path.join(process.env.THEMIS_QUALS_TEAM_LOGOS_DIR, `team-${team.id}.png`)
      fs.lstat(filename, function (err, stats) {
        if (err) {
          const nologoFilename = path.join(__dirname, '..', '..', 'nologo.png')
          response.sendFile(nologoFilename)
        } else {
          response.sendFile(filename)
        }
      })
    } else {
      if (err) {
        logger.error(err)
      }
      response.status(404).json('Team not found!')
    }
  })
})

router.get('/:teamId/profile', detectScope, function (request, response) {
  TeamController.get(request.teamId, function (err, team) {
    if (team) {
      const exposeEmail = request.scope.isSupervisor() || (request.scope.isTeam() && request.session.identityID === team.id)
      response.json(teamSerializer(team, { exposeEmail: exposeEmail }))
    } else {
      if (err) {
        logger.error(err)
      }
      response.status(404).json('Team not found!')
    }
  })
})

router.post('/reset-password', checkToken, needsToBeUnauthorized, urlencodedParser, function (request, response, next) {
  const resetConstraints = {
    team: constraints.base64url,
    code: constraints.base64url,
    password: constraints.password
  }

  const validationResult = validator.validate(request.body, resetConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.resetPassword(request.body.team, request.body.code, request.body.password, function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/update-password', checkToken, needsToBeAuthorizedTeam, urlencodedParser, function (request, response, next) {
  const changeConstraints = {
    currentPassword: constraints.password,
    newPassword: constraints.password
  }

  const validationResult = validator.validate(request.body, changeConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.updatePassword(request.session.identityID, request.body.currentPassword, request.body.newPassword, function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/update-profile', checkToken, needsToBeAuthorizedTeam, contestNotFinished, urlencodedParser, function (request, response, next) {
  const countryId = parseInt(request.body.countryId, 10)
  if (is_.number(countryId)) {
    request.body.countryId = countryId
  } else {
    throw new ValidationError()
  }

  const editConstraints = {
    countryId: constraints.countryId,
    locality: constraints.locality,
    institution: constraints.institution
  }

  const validationResult = validator.validate(request.body, editConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.updateProfile(request.session.identityID, request.body.countryId, request.body.locality, request.body.institution, function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/resend-confirmation-email', checkToken, needsToBeAuthorizedTeam, contestNotFinished, function (request, response, next) {
  TeamController.resendConfirmationEmail(request.session.identityID, function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/update-email', checkToken, needsToBeAuthorizedTeam, contestNotFinished, urlencodedParser, function (request, response, next) {
  const changeConstraints = {
    email: constraints.email
  }

  const validationResult = validator.validate(request.body, changeConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  emailAddressValidator
  .validate(request.body.email)
  .then(function () {
    return TeamController.updateEmail2(request.session.identityID, request.body.email)
  })
  .then(function () {
    response.json({ success: true })
  })
  .catch(function (err) {
    next(err)
  })
})

router.post('/restore', checkToken, needsToBeUnauthorized, urlencodedParser, function (request, response, next) {
  const restoreConstraints = {
    email: constraints.email
  }

  const validationResult = validator.validate(request.body, restoreConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.restore(request.body.email, function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/signin', checkToken, needsToBeUnauthorized, urlencodedParser, function (request, response, next) {
  const signinConstraints = {
    team: constraints.team,
    password: constraints.password
  }

  const validationResult = validator.validate(request.body, signinConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.signin(request.body.team, request.body.password, function (err, team) {
    if (err) {
      next(err)
    } else {
      request.session.authenticated = true
      request.session.identityID = team.id
      request.session.scopeID = SCOPE_TEAM
      response.json({ success: true })
    }
  })
})

router.post('/signout', needsToBeAuthorizedTeam, getTeam, function (request, response, next) {
  request.session.authenticated = false
  request.session.destroy(function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
      EventController.push(new LogoutTeamEvent(request.team))
    }
  })
})

const multidataParser = busboy({
  immediate: true,
  limits: {
    fieldSize: 200,
    fields: 10,
    fileSize: parseInt(process.env.THEMIS_QUALS_POST_MAX_TEAM_LOGO_SIZE, 10) * 1024 * 1024,
    files: 1
  }
})

router.post('/update-logo', checkToken, needsToBeAuthorizedTeam, contestNotFinished, multidataParser, function (request, response, next) {
  const teamLogo = tmp.fileSync({
    mode: 0o666,
    dir: process.env.THEMIS_QUALS_UPLOAD_TMP_DIR,
    keep: true
  })

  request.busboy.on('file', function (fieldName, file, filename, encoding, mimetype) {
    file.on('data', function (data) {
      if (fieldName === 'logo') {
        fs.appendFileSync(teamLogo.name, data)
      }
    })
  })

  request.busboy.on('finish', function () {
    gm(teamLogo.name).size(function (err, size) {
      if (err) {
        logger.error(err)
        next(new InvalidImageError())
      } else {
        if (size.width < 48) {
          next(new ImageDimensionsError())
        } else if (size.width !== size.height) {
          next(new ImageAspectRatioError())
        } else {
          TeamController.updateLogo(request.session.identityID, teamLogo.name, function (err) {
            if (err) {
              next(err)
            } else {
              response.json({ success: true })
            }
          })
        }
      }
    })
  })
})

router.post('/signup', checkToken, needsToBeUnauthorized, contestNotFinished, multidataParser, function (request, response, next) {
  const teamInfo = {}
  const teamLogo = tmp.fileSync({
    mode: 0o666,
    dir: process.env.THEMIS_QUALS_UPLOAD_TMP_DIR,
    keep: true
  })

  request.busboy.on('file', function (fieldName, file, filename, encoding, mimetype) {
    file.on('data', function (data) {
      if (fieldName === 'logo') {
        fs.appendFileSync(teamLogo.name, data)
        teamInfo['logoFilename'] = teamLogo.name
      }
    })
  })

  request.busboy.on('field', function (fieldName, val, fieldNameTruncated, valTruncated) {
    teamInfo[fieldName] = val
  })

  request.busboy.on('finish', function () {
    const countryId = parseInt(teamInfo.countryId, 10)
    if (is_.number(countryId)) {
      teamInfo.countryId = countryId
    } else {
      throw new ValidationError()
    }

    const signupConstraints = {
      team: constraints.team,
      email: constraints.email,
      password: constraints.password,
      countryId: constraints.countryId,
      locality: constraints.locality
    }

    const validationResult = validator.validate(teamInfo, signupConstraints)
    if (validationResult === true) {
      gm(teamLogo.name).size(function (err, size) {
        if (err) {
          logger.error(err)
          next(new InvalidImageError())
        } else {
          if (size.width < 48) {
            next(new ImageDimensionsError())
          } else if (size.width !== size.height) {
            next(new ImageAspectRatioError())
          } else {
            emailAddressValidator
              .validate(teamInfo.email)
              .then(function () {
                TeamController.create(teamInfo, function (err, team) {
                  if (err) {
                    next(err)
                  } else {
                    response.json({ success: true })
                  }
                })
              })
              .catch(function (err) {
                next(err)
              })
          }
        }
      })
    } else {
      next(new ValidationError())
    }
  })
})

module.exports = router

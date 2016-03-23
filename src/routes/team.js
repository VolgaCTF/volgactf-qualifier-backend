import express from 'express'
import bodyParser from 'body-parser'
import busboy from 'connect-busboy'
import logger from '../utils/logger'
import constraints from '../utils/constraints'
import tmp from 'tmp'
import fs from 'fs'
import gm from 'gm'
import path from 'path'

import TeamController from '../controllers/team'
import Validator from 'validator.js'
let validator = new Validator.Validator()
let router = express.Router()
let urlencodedParser = bodyParser.urlencoded({ extended: false })
import { InternalError, ValidationError, InvalidImageError, ImageDimensionsError, ImageAspectRatioError, NotAuthenticatedError } from '../utils/errors'
import _ from 'underscore'
import is_ from 'is_js'

import { detectScope, needsToBeUnauthorized, needsToBeAuthorizedTeam } from '../middleware/session'
import { checkToken } from '../middleware/security'
import { contestNotFinished } from '../middleware/contest'

import teamSerializer from '../serializers/team'

import teamParam from '../params/team'
import { getTeam } from '../middleware/team'
import EventController from '../controllers/event'
import LogoutTeamEvent from '../events/logout-team'
import constants from '../utils/constants'
import TeamScoreController from '../controllers/team-score'
import teamScoreSerializer from '../serializers/team-score'
import TeamTaskHitController from '../controllers/team-task-hit'
import teamTaskHitSerializer from '../serializers/team-task-hit'
import TeamTaskReviewController from '../controllers/team-task-review'
import teamTaskReviewSerializer from '../serializers/team-task-review'

router.get('/index', detectScope, (request, response, next) => {
  TeamController.index((err, teams) => {
    if (err) {
      logger.error(err)
      next(new InternalError())
    } else {
      let serializer = _.partial(teamSerializer, _, { exposeEmail: request.scope.isSupervisor() })
      response.json(_.map(teams, serializer))
    }
  }, !request.scope.isSupervisor())
})

router.get('/score/index', (request, response, next) => {
  TeamScoreController.index((err, teamScores) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(teamScores, teamScoreSerializer))
    }
  })
})

router.param('teamId', teamParam.id)

router.get('/:teamId/hit/index', detectScope, (request, response, next) => {
  if (!(request.scope.isTeam() && request.session.identityID === request.teamId) && !request.scope.isSupervisor()) {
    throw new NotAuthenticatedError()
  }

  TeamTaskHitController.listForTeam(request.teamId, (err, teamTaskHits) => {
    if (err) {
      next(err)
    } else {
      response.json(teamTaskHits.map(teamTaskHitSerializer))
    }
  })
})

router.get('/:teamId/hit/statistics', (request, response, next) => {
  TeamTaskHitController.listForTeam(request.teamId, (err, teamTaskHits) => {
    if (err) {
      next(err)
    } else {
      response.json({
        count: teamTaskHits.length
      })
    }
  })
})

router.get('/:teamId/review/index', detectScope, (request, response, next) => {
  if (!(request.scope.isTeam() && request.session.identityID === request.teamId) && !request.scope.isSupervisor()) {
    throw new NotAuthenticatedError()
  }

  TeamTaskReviewController.indexByTeam(request.teamId, (err, teamTaskReviews) => {
    if (err) {
      next(err)
    } else {
      response.json(teamTaskReviews.map(teamTaskReviewSerializer))
    }
  })
})

router.get('/:teamId/review/statistics', (request, response, next) => {
  TeamTaskReviewController.indexByTeam(request.teamId, (err, teamTaskReviews) => {
    if (err) {
      next(err)
    } else {
      let averageRating = _.reduce(teamTaskReviews, (sum, review) => {
        return sum + review.rating
      }, 0) / (teamTaskReviews.length === 0 ? 1 : teamTaskReviews.length)

      response.json({
        count: teamTaskReviews.length,
        averageRating: averageRating
      })
    }
  })
})

router.get('/:teamId/logo', (request, response) => {
  TeamController.get(request.teamId, (err, team) => {
    if (team) {
      let filename = path.join(process.env.THEMIS_TEAM_LOGOS_DIR, `team-${team.id}.png`)
      fs.lstat(filename, (err, stats) => {
        if (err) {
          let nologoFilename = path.join(__dirname, '..', '..', 'nologo.png')
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

router.get('/:teamId/profile', detectScope, (request, response) => {
  TeamController.get(request.teamId, (err, team) => {
    if (team) {
      let exposeEmail = request.scope.isSupervisor() || (request.scope.isTeam() && request.session.identityID === team.id)
      response.json(teamSerializer(team, { exposeEmail: exposeEmail }))
    } else {
      if (err) {
        logger.error(err)
      }
      response.status(404).json('Team not found!')
    }
  })
})

router.post('/verify-email', checkToken, contestNotFinished, urlencodedParser, (request, response, next) => {
  let verifyConstraints = {
    team: constraints.base64url,
    code: constraints.base64url
  }

  let validationResult = validator.validate(request.body, verifyConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.verifyEmail(request.body.team, request.body.code, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/reset-password', checkToken, needsToBeUnauthorized, urlencodedParser, (request, response, next) => {
  let resetConstraints = {
    team: constraints.base64url,
    code: constraints.base64url,
    password: constraints.password
  }

  let validationResult = validator.validate(request.body, resetConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.resetPassword(request.body.team, request.body.code, request.body.password, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/update-password', checkToken, needsToBeAuthorizedTeam, urlencodedParser, (request, response, next) => {
  let changeConstraints = {
    currentPassword: constraints.password,
    newPassword: constraints.password
  }

  let validationResult = validator.validate(request.body, changeConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.updatePassword(request.session.identityID, request.body.currentPassword, request.body.newPassword, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/update-profile', checkToken, needsToBeAuthorizedTeam, contestNotFinished, urlencodedParser, (request, response, next) => {
  let countryId = parseInt(request.body.countryId, 10)
  if (is_.number(countryId)) {
    request.body.countryId = countryId
  } else {
    throw new ValidationError()
  }

  let editConstraints = {
    countryId: constraints.countryId,
    locality: constraints.locality,
    institution: constraints.institution
  }

  let validationResult = validator.validate(request.body, editConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.updateProfile(request.session.identityID, request.body.countryId, request.body.locality, request.body.institution, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/resend-confirmation-email', checkToken, needsToBeAuthorizedTeam, contestNotFinished, (request, response, next) => {
  TeamController.resendConfirmationEmail(request.session.identityID, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/update-email', checkToken, needsToBeAuthorizedTeam, contestNotFinished, urlencodedParser, (request, response, next) => {
  let changeConstraints = {
    email: constraints.email
  }

  let validationResult = validator.validate(request.body, changeConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.updateEmail(request.session.identityID, request.body.email, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/restore', checkToken, needsToBeUnauthorized, urlencodedParser, (request, response, next) => {
  let restoreConstraints = {
    email: constraints.email
  }

  let validationResult = validator.validate(request.body, restoreConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.restore(request.body.email, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/signin', checkToken, needsToBeUnauthorized, urlencodedParser, (request, response, next) => {
  let signinConstraints = {
    team: constraints.team,
    password: constraints.password
  }

  let validationResult = validator.validate(request.body, signinConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  TeamController.signin(request.body.team, request.body.password, (err, team) => {
    if (err) {
      next(err)
    } else {
      request.session.authenticated = true
      request.session.identityID = team.id
      request.session.scopeID = constants.SCOPE_TEAM
      response.json({ success: true })
    }
  })
})

router.post('/signout', checkToken, needsToBeAuthorizedTeam, getTeam, (request, response, next) => {
  request.session.authenticated = false
  request.session.destroy((err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
      EventController.push(new LogoutTeamEvent(request.team))
    }
  })
})

let multidataParser = busboy({
  immediate: true,
  limits: {
    fieldSize: 200,
    fields: 10,
    fileSize: 1 * 1024 * 1024,
    files: 1
  }
})

router.post('/update-logo', checkToken, needsToBeAuthorizedTeam, contestNotFinished, multidataParser, (request, response, next) => {
  let teamLogo = tmp.fileSync()

  request.busboy.on('file', (fieldName, file, filename, encoding, mimetype) => {
    file.on('data', (data) => {
      if (fieldName === 'logo') {
        fs.appendFileSync(teamLogo.name, data)
      }
    })
  })

  request.busboy.on('finish', () => {
    gm(teamLogo.name).size((err, size) => {
      if (err) {
        logger.error(err)
        next(new InvalidImageError())
      } else {
        if (size.width < 48) {
          next(new ImageDimensionsError())
        } else if (size.width !== size.height) {
          next(new ImageAspectRatioError())
        } else {
          TeamController.updateLogo(request.session.identityID, teamLogo.name, (err) => {
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

router.post('/signup', checkToken, needsToBeUnauthorized, contestNotFinished, multidataParser, (request, response, next) => {
  let teamInfo = {}
  let teamLogo = tmp.fileSync()

  request.busboy.on('file', (fieldName, file, filename, encoding, mimetype) => {
    file.on('data', (data) => {
      if (fieldName === 'logo') {
        fs.appendFileSync(teamLogo.name, data)
        teamInfo['logoFilename'] = teamLogo.name
      }
    })
  })

  request.busboy.on('field', (fieldName, val, fieldNameTruncated, valTruncated) => {
    teamInfo[fieldName] = val
  })

  request.busboy.on('finish', () => {
    let countryId = parseInt(teamInfo.countryId, 10)
    if (is_.number(countryId)) {
      teamInfo.countryId = countryId
    } else {
      throw new ValidationError()
    }

    let signupConstraints = {
      team: constraints.team,
      email: constraints.email,
      password: constraints.password,
      countryId: constraints.countryId,
      locality: constraints.locality,
      institution: constraints.institution
    }

    let validationResult = validator.validate(teamInfo, signupConstraints)
    if (validationResult === true) {
      gm(teamLogo.name).size((err, size) => {
        if (err) {
          logger.error(err)
          next(new InvalidImageError())
        } else {
          if (size.width < 48) {
            next(new ImageDimensionsError())
          } else if (size.width !== size.height) {
            next(new ImageAspectRatioError())
          } else {
            TeamController.create(teamInfo, (err, team) => {
              if (err) {
                next(err)
              } else {
                response.json({ success: true })
              }
            })
          }
        }
      })
    } else {
      next(new ValidationError())
    }
  })
})

export default router

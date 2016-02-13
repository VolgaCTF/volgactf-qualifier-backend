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
import { InternalError, ValidationError, InvalidImageError, ImageDimensionsError, ImageAspectRatioError } from '../utils/errors'
import _ from 'underscore'

import { detectScope, needsToBeUnauthorized, needsToBeAuthorizedTeam } from '../middleware/session'
import { checkToken } from '../middleware/security'
import { contestNotFinished } from '../middleware/contest'

import teamSerializer from '../serializers/team'

import teamParam from '../params/team'

router.get('/all', detectScope, (request, response, next) => {
  let onFetch = function (exposeEmail) {
    let serializer = _.partial(teamSerializer, _, { exposeEmail: exposeEmail })
    return (err, teams) => {
      if (err) {
        logger.error(err)
        next(new InternalError())
      } else {
        response.json(_.map(teams, serializer))
      }
    }
  }

  if (request.scope === 'supervisors') {
    TeamController.list(onFetch(true))
  } else {
    TeamController.listQualified(onFetch(false))
  }
})

router.param('teamId', teamParam.id)

router.get('/:teamId/logo', (request, response) => {
  TeamController.get(request.teamId, (err, team) => {
    if (team) {
      let filename = path.join(process.env.LOGOS_DIR, `team-${team.id}.png`)
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

router.get('/:teamId/profile', (request, response) => {
  TeamController.get(request.teamId, (err, team) => {
    if (team) {
      let result = {
        id: team.id,
        name: team.name,
        country: team.country,
        locality: team.locality,
        institution: team.institution,
        createdAt: team.createdAt.getTime()
      }

      if (request.session.authenticated && ((request.session.role === 'team' && request.session.identityID === team.id) || _.contains(['admin', 'manager'], request.session.role))) {
        result.email = team.email
        result.emailConfirmed = team.emailConfirmed
      }
      response.json(result)
    } else {
      if (err) {
        logger.error(err)
      }
      response.status(404).json('Team not found!')
    }
  })
})

router.post('/verify-email', checkToken, urlencodedParser, (request, response, next) => {
  let verifyConstraints = {
    team: constraints.base64url,
    code: constraints.base64url
  }

  let validationResult = validator.validate(request.body, verifyConstraints)
  if (!validationResult) {
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
  if (!validationResult) {
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

router.post('/change-password', checkToken, needsToBeAuthorizedTeam, urlencodedParser, (request, response, next) => {
  let changeConstraints = {
    currentPassword: constraints.password,
    newPassword: constraints.password
  }

  let validationResult = validator.validate(request.body, changeConstraints)
  if (!validationResult) {
    throw new ValidationError()
  }

  TeamController.changePassword(request.session.identityID, request.body.currentPassword, request.body.newPassword, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/edit-profile', checkToken, needsToBeAuthorizedTeam, urlencodedParser, (request, response, next) => {
  let editConstraints = {
    country: constraints.country,
    locality: constraints.locality,
    institution: constraints.institution
  }

  let validationResult = validator.validate(request.body, editConstraints)
  if (!validationResult) {
    throw new ValidationError()
  }

  TeamController.editProfile(request.session.identityID, request.body.country, request.body.locality, request.body.institution, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/resend-confirmation-email', checkToken, needsToBeAuthorizedTeam, (request, response, next) => {
  TeamController.resendConfirmationEmail(request.session.identityID, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/change-email', checkToken, needsToBeAuthorizedTeam, urlencodedParser, (request, response, next) => {
  let changeConstraints = {
    email: constraints.email
  }

  let validationResult = validator.validate(request.body, changeConstraints)
  if (!validationResult) {
    throw new ValidationError()
  }

  TeamController.changeEmail(request.session.identityID, request.body.email, (err) => {
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
  if (!validationResult) {
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
  if (!validationResult) {
    throw new ValidationError()
  }

  TeamController.signin(request.body.team, request.body.password, (err, team) => {
    if (err) {
      next(err)
    } else {
      request.session.authenticated = true
      request.session.identityID = team.id
      request.session.role = 'team'
      response.json({ success: true })
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

router.post('/upload-logo', checkToken, needsToBeAuthorizedTeam, multidataParser, (request, response, next) => {
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
          TeamController.changeLogo(request.session.identityID, teamLogo.name, (err) => {
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

router.post('/signup', contestNotFinished, checkToken, needsToBeUnauthorized, multidataParser, (request, response, next) => {
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
    let signupConstraints = {
      team: constraints.team,
      email: constraints.email,
      password: constraints.password,
      country: constraints.country,
      locality: constraints.locality,
      institution: constraints.institution
    }

    let validationResult = validator.validate(teamInfo, signupConstraints)
    if (validationResult) {
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

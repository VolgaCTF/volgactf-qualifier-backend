import express from 'express'
let router = express.Router()

import bodyParser from 'body-parser'
import { checkToken } from '../middleware/security'
import { needsToBeUnauthorized, needsToBeAuthorizedSupervisor } from '../middleware/session'
import { ValidationError, InvalidSupervisorCredentialsError } from '../utils/errors'

import Validator from 'validator.js'
let validator = new Validator.Validator()
import constraints from '../utils/constraints'
import SupervisorController from '../controllers/supervisor'
import EventController from '../controllers/event'
import LogoutSupervisorEvent from '../events/logout-supervisor'
import { getSupervisor } from '../middleware/supervisor'
import constants from '../utils/constants'

let urlencodedParser = bodyParser.urlencoded({ extended: false })

router.post('/signin', checkToken, needsToBeUnauthorized, urlencodedParser, (request, response, next) => {
  let loginConstraints = {
    username: constraints.username,
    password: constraints.password
  }

  let validationResult = validator.validate(request.body, loginConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  SupervisorController.login(request.body.username, request.body.password, (err, supervisor) => {
    if (err) {
      next(err)
    } else {
      if (supervisor) {
        request.session.authenticated = true
        request.session.identityID = supervisor.id
        if (supervisor.rights === 'admin') {
          request.session.scopeID = constants.SCOPE_ADMIN
        } else if (supervisor.rights === 'manager') {
          request.session.scopeID = constants.SCOPE_MANAGER
        }
        response.json({ success: true })
      } else {
        next(new InvalidSupervisorCredentialsError())
      }
    }
  })
})

router.post('/signout', checkToken, needsToBeAuthorizedSupervisor, getSupervisor, (request, response, next) => {
  request.session.authenticated = false
  request.session.destroy((err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
      EventController.push(new LogoutSupervisorEvent(request.supervisor))
    }
  })
})

export default router

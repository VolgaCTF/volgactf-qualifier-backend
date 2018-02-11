const express = require('express')
const router = express.Router()

const bodyParser = require('body-parser')
const { checkToken } = require('../middleware/security')
const { needsToBeUnauthorized, needsToBeAuthorizedSupervisor } = require('../middleware/session')
const { ValidationError, InvalidSupervisorCredentialsError } = require('../utils/errors')

const Validator = require('validator.js')
const validator = new Validator.Validator()
const constraints = require('../utils/constraints')
const SupervisorController = require('../controllers/supervisor')
const EventController = require('../controllers/event')
const LogoutSupervisorEvent = require('../events/logout-supervisor')
const { getSupervisor } = require('../middleware/supervisor')
const { SCOPE_ADMIN, SCOPE_MANAGER } = require('../utils/constants')

const urlencodedParser = bodyParser.urlencoded({ extended: false })

router.post('/signin', checkToken, needsToBeUnauthorized, urlencodedParser, function (request, response, next) {
  const loginConstraints = {
    username: constraints.username,
    password: constraints.password
  }

  const validationResult = validator.validate(request.body, loginConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  SupervisorController.login(request.body.username, request.body.password, function (err, supervisor) {
    if (err) {
      next(err)
    } else {
      if (supervisor) {
        request.session.authenticated = true
        request.session.identityID = supervisor.id
        if (supervisor.rights === 'admin') {
          request.session.scopeID = SCOPE_ADMIN
        } else if (supervisor.rights === 'manager') {
          request.session.scopeID = SCOPE_MANAGER
        }
        response.json({ success: true })
      } else {
        next(new InvalidSupervisorCredentialsError())
      }
    }
  })
})

router.post('/signout', checkToken, needsToBeAuthorizedSupervisor, getSupervisor, function (request, response, next) {
  request.session.authenticated = false
  request.session.destroy(function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
      EventController.push(new LogoutSupervisorEvent(request.supervisor))
    }
  })
})

module.exports = router

const express = require('express')
const _ = require('underscore')
const router = express.Router()

const RemoteCheckerController = require('../controllers/remote-checker')

const { checkToken } = require('../middleware/security')
const { needsToBeAuthorizedAdmin } = require('../middleware/session')
const { contestNotFinished } = require('../middleware/contest')

const Validator = require('validator.js')
const validator = new Validator.Validator()
const constraints = require('../utils/constraints')

const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: false })

const remoteCheckerParam = require('../params/remote-checker')
const { ValidationError } = require('../utils/errors')

router.post('/create', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, function (request, response, next) {
  const createConstraints = {
    name: constraints.remoteCheckerName,
    url: constraints.remoteCheckerUrl,
    authUsername: constraints.remoteCheckerAuthUsername,
    authPassword: constraints.password
  }

  const validationResult = validator.validate(request.body, createConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  RemoteCheckerController
  .create(
    request.body.name,
    request.body.url,
    request.body.authUsername,
    request.body.authPassword
  )
  .then(function(remoteChecker) {
    response.json({ success: true })
  })
  .catch(function (err) {
    next(err)
  })
})

router.param('remoteCheckerId', remoteCheckerParam.id)

router.post('/:remoteCheckerId/delete', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, function (request, response, next) {
  RemoteCheckerController
  .delete(request.remoteCheckerId)
  .then(function () {
    response.json({ success: true })
  })
  .catch(function (err) {
    next(err)
  })
})

router.post('/:remoteCheckerId/update', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, function (request, response, next) {
  const updateConstraints = {
    name: constraints.remoteCheckerName,
    url: constraints.remoteCheckerUrl,
    authUsername: constraints.remoteCheckerAuthUsername,
    authPassword: constraints.password
  }

  const validationResult = validator.validate(request.body, updateConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  RemoteCheckerController
  .update(
    request.remoteCheckerId,
    request.body.name,
    request.body.url,
    request.body.authUsername,
    request.body.authPassword
  )
  .then(function (remoteChecker) {
    response.json({ success: true })
  })
  .catch(function (err) {
    next(err)
  })
})

module.exports = router

const express = require('express')
const router = express.Router()

const logger = require('../utils/logger')
const queue = require('../utils/queue')

const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()

const mailgun = require('mailgun-js')

const webhookResponseController = require('../controllers/webhook-response')
const { verifyAwsSignature, overrideContentType } = require('../middleware/aws-signature')

const emailTransport = process.env.VOLGACTF_QUALIFIER_EMAIL_TRANSPORT

if (emailTransport === 'mailgun') {
  const mailgunClient = mailgun({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN
  })

  router.post('/mailgun', jsonParser, function (request, response, next) {
    let timestamp = null
    let token = null
    let signature = null
    if (request.body.hasOwnProperty('signature')) {
      const sig = request.body.signature
      timestamp = sig.hasOwnProperty('timestamp') ? sig.timestamp : null
      token = sig.hasOwnProperty('token') ? sig.token : null
      signature = sig.hasOwnProperty('signature') ? sig.signature : null
    }
    if (!mailgunClient.validateWebhook(timestamp, token, signature)) {
      response.status(400).send('error')
    } else {
      webhookResponseController.create({
        data: request.body
      })
      .then(function () {
        response.status(200).send('ok')
      })
      .catch(function (err) {
        logger.error(err)
        response.status(500).send('Internal Server Error')
      })
    }
  })
} else if (emailTransport === 'smtp') {
  router.post('/aws', overrideContentType, jsonParser, verifyAwsSignature, function (request, response, next) {
    if (request.body.Type === 'Notification') {
      webhookResponseController.create({
        data: request.body
      })
      .then(function () {
        response.status(200).send('ok')
      })
      .catch(function (err) {
        logger.error(err)
        response.status(500).send('Internal Server Error')
      })
    } else if (request.body.Type === 'SubscriptionConfirmation' && request.body.hasOwnProperty('SubscribeURL')) {
      queue('subscribeAwsSns').add({
        url: request.body.SubscribeURL
      })
      response.status(200).send('ok')
    } else if (request.body.Type === 'UnsubscribeConfirmation') {
      response.status(200).send('ok')
    } else {
      response.status(400).send('error')
    }
  })
}

module.exports = router

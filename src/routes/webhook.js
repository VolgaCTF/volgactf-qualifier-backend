const express = require('express')
const router = express.Router()

const logger = require('../utils/logger')
const queue = require('../utils/queue')

const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()

const webhookResponseController = require('../controllers/webhook-response')
const { verifyAwsSignature, overrideContentType } = require('../middleware/aws-signature')

const emailWebhook = process.env.VOLGACTF_QUALIFIER_EMAIL_WEBHOOK

if (emailWebhook === 'aws') {
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

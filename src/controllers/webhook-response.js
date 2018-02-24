const WebhookResponse = require('../models/webhook-response')
const { InternalError } = require('../utils/errors')
const logger = require('../utils/logger')

class WebhookResponseController {
  create (options, callback) {
    return new Promise(function (resolve, reject) {
      WebhookResponse
        .query()
        .insert({
          data: options.data,
          createdAt: new Date()
        })
        .then(function (webhookResponse) {
          resolve(webhookResponse)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }
}

module.exports = new WebhookResponseController()

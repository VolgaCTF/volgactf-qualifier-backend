const Message = require('../models/message')
const { InternalError } = require('../utils/errors')
const logger = require('../utils/logger')

class MessageController {
  create (options, callback) {
    return new Promise(function (resolve, reject) {
      Message
        .query()
        .insert({
          message: options.message,
          recipientEmail: options.recipientEmail,
          recipientName: options.recipientName,
          status: 'not sent',
          teamId: options.teamId,
          supervisorId: options.supervisorId,
          createdAt: new Date()
        })
        .then(function (message) {
          resolve(message)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  update (options, callback) {
    return new Promise(function (resolve, reject) {
      Message
        .query()
        .patchAndFetchById(options.id, {
          status: options.status
        })
        .then(function (message) {
          resolve(message)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }
}

module.exports = new MessageController()

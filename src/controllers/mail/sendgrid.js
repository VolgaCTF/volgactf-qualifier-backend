const logger = require('../../utils/logger')
const sendgrid = require('sendgrid')

class SendGridController {
  static sendEmail (message, recipientEmail, recipientName) {
    return new Promise(function (resolve, reject) {
      const payload = {
        to: recipientEmail,
        toname: recipientName,
        from: process.env.THEMIS_QUALS_EMAIL_SENDER_ADDRESS,
        fromname: process.env.THEMIS_QUALS_EMAIL_SENDER_NAME,
        subject: message.subject,
        text: message.plain,
        html: message.html
      }

      const client = sendgrid(process.env.SENDGRID_API_KEY)
      client.send(payload, function (err, result) {
        if (err) {
          logger.error(err)
          reject(err)
        } else {
          logger.info(result)
          resolve()
        }
      })
    })
  }
}

module.exports = SendGridController

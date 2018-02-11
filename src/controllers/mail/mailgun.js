const logger = require('../../utils/logger')
const mailgun = require('mailgun-js')

class MailgunController {
  static sendEmail (message, recipientEmail, recipientName) {
    return new Promise(function (resolve, reject) {
      const data = {
        from: `${process.env.THEMIS_QUALS_EMAIL_SENDER_NAME} <${process.env.THEMIS_QUALS_EMAIL_SENDER_ADDRESS}>`,
        to: `${recipientName} <${recipientEmail}>`,
        subject: message.subject,
        text: message.plain,
        html: message.html
      }

      const client = mailgun({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
      })

      client.messages().send(data, function (err, body) {
        if (err) {
          logger.error(err)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

module.exports = MailgunController

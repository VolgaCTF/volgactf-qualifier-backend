const logger = require('../../utils/logger')
const mailgun = require('mailgun-js')

class MailgunController {
  static sendEmail (message, recipientEmail, recipientName, messageId) {
    return new Promise(function (resolve, reject) {
      const data = {
        from: `${process.env.VOLGACTF_QUALIFIER_EMAIL_SENDER_NAME} <${process.env.VOLGACTF_QUALIFIER_EMAIL_SENDER_ADDRESS}>`,
        to: `${recipientName} <${recipientEmail}>`,
        subject: message.subject,
        text: message.plain,
        html: message.html
      }

      data['v:volgactf_qualifier_message_id'] = messageId

      const client = mailgun({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
      })

      client.messages().send(data, function (err, body) {
        if (err) {
          logger.error(err)
          reject(err)
        } else {
          resolve(body)
        }
      })
    })
  }
}

module.exports = MailgunController

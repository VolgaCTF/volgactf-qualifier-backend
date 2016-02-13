import logger from '../utils/logger'
import mailgun from 'mailgun-js'

export default class MailgunController {
  static sendEmail (message, recipientEmail, recipientName) {
    return new Promise((resolve, reject) => {
      let data = {
        from: `VolgaCTF <${process.env.EMAIL_SENDER}>`,
        to: `${recipientName} <${recipientEmail}>`,
        subject: message.subject,
        text: message.plain,
        html: message.html
      }

      let client = mailgun({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
      })

      client.messages().send(data, (err, body) => {
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

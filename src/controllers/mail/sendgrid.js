import logger from '../../utils/logger'
import sendgrid from 'sendgrid'

export default class SendGridController {
  static sendEmail (message, recipientEmail, recipientName) {
    return new Promise((resolve, reject) => {
      let payload = {
        to: recipientEmail,
        toname: recipientName,
        from: process.env.THEMIS_QUALS_EMAIL_SENDER_ADDRESS,
        fromname: process.env.THEMIS_QUALS_EMAIL_SENDER_NAME,
        subject: message.subject,
        text: message.plain,
        html: message.html
      }

      let client = sendgrid(process.env.SENDGRID_API_KEY)
      client.send(payload, (err, result) => {
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

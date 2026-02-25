const logger = require('../../utils/logger')
const nodemailer = require('nodemailer')

class SMTPController {
  static sendEmail (message, recipientEmail, recipientName, messageId) {
    return new Promise(function (resolve, reject) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'yes',
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD
        },
        tls: {
          minVersion: "TLSv1.2",
          rejectUnauthorized: true, // make sure cert is valid
        },
      })

      const headers = JSON.parse(process.env.SMTP_HEADERS_JSON || '{}')
      headers['X-VolgaCTF-Qualifier-Message-Id'] = messageId

      const data = {
        from: `${process.env.VOLGACTF_QUALIFIER_EMAIL_SENDER_NAME} <${process.env.VOLGACTF_QUALIFIER_EMAIL_SENDER_ADDRESS}>`,
        to: `${recipientName} <${recipientEmail}>`,
        subject: message.subject,
        text: message.plain,
        html: message.html,
        headers
      }

      transporter.sendMail(data, function (err, info) {
        if (err) {
          logger.error(err)
          reject(err)
        } else {
          resolve(info)
        }
      })
    })
  }
}

module.exports = SMTPController

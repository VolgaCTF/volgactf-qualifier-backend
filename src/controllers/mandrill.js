import logger from '../utils/logger'
import mandrill from 'mandrill-api/mandrill'

export default class MandrillController {
  static sendEmail (message, recipientEmail, recipientName) {
    return new Promise((resolve, reject) => {
      let params = {
        message: {
          html: message.html,
          text: message.plain,
          subject: message.subject,
          from_email: process.env.EMAIL_SENDER,
          from_name: 'VolgaCTF',
          to: [{
            email: recipientEmail,
            name: recipientName,
            type: 'to'
          }],
          trans_opens: true,
          trans_clicks: true,
          auto_text: false,
          auto_html: false,
          url_strip_qs: false
        },
        async: false
      }

      let client = new mandrill.Mandrill(process.env.MANDRILL_API_KEY)
      client.messages.send(
        params,
        (result) => {
          logger.info(result)
          resolve()
        },
        (err) => {
          logger.error(`Mandrill error: ${err.name} - ${err.name}`)
          reject(err)
        })
    })
  }
}

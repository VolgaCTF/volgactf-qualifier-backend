import queue from './utils/queue'
import logger from './utils/logger'
import gm from 'gm'
import path from 'path'
import mandrill from 'mandrill-api/mandrill'
import EmailController from './controllers/email'
import token from './utils/token'
import ContestController from './controllers/contest'


queue('updateScoresQueue').process((job, done) => {
  ContestController.updateScores((err) => {
    if (err) {
      logger.error(err)
      throw err
    } else {
      done()
    }
  })
})


queue('createLogoQueue').process((job, done) => {
  let newFilename = path.join(process.env.LOGOS_DIR, `team-${job.data.id}.png`)
  gm(job.data.filename)
    .resize(48, 48)
    .write(newFilename, (err) => {
      if (err) {
        logger.error(err)
        throw err
      } else {
        done()
      }
    })
})


queue('sendEmailQueue').process((job, done) => {
  let email = null
  if (job.data.message === 'welcome') {
    email = EmailController.generateWelcomeEmail({
      name: job.data.name,
      domain: process.env.DOMAIN,
      team: token.encode(job.data.email),
      code: token.encode(job.data.token)
    })
  } else if (job.data.message === 'restore') {
    email = EmailController.generateRestoreEmail({
      name: job.data.name,
      domain: process.env.DOMAIN,
      team: token.encode(job.data.email),
      code: token.encode(job.data.token)
    })
  }

  if (!email) {
    done()
    return
  }

  let params = {
    message: {
      html: email.html,
      text: email.plain,
      subject: email.subject,
      from_email: process.env.EMAIL_SENDER,
      from_name: 'VolgaCTF',
      to: [{
        email: job.data.email,
        name: job.data.name,
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

  let onSend = function (result) {
    logger.info(result)
    done()
  }

  let onError = function (e) {
    logger.error(`A mandrill error occurred: ${e.name} - ${e.message}`)
    done()
  }

  let client = new mandrill.Mandrill(process.env.MANDRILL_API_KEY)
  client.messages.send(params, onSend, onError)
})

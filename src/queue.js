import queue from './utils/queue'
import logger from './utils/logger'
import gm from 'gm'
import path from 'path'
import EmailController from './controllers/email'
import token from './utils/token'
import ContestController from './controllers/contest'
import MandrillController from './controllers/mandrill'
import MailgunController from './controllers/mailgun'

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
  let message = null
  if (job.data.message === 'welcome') {
    message = EmailController.generateWelcomeEmail({
      name: job.data.name,
      domain: process.env.DOMAIN,
      team: token.encode(job.data.email),
      code: token.encode(job.data.token)
    })
  } else if (job.data.message === 'restore') {
    message = EmailController.generateRestoreEmail({
      name: job.data.name,
      domain: process.env.DOMAIN,
      team: token.encode(job.data.email),
      code: token.encode(job.data.token)
    })
  }

  if (!message) {
    done()
    return
  }

  let senderController = null
  if (process.env.MAIL_TRANSPORT === 'mandrill') {
    senderController = MandrillController
  } else if (process.env.MAIL_TRANSPORT === 'mailgun') {
    senderController = MailgunController
  }

  if (!senderController) {
    done()
    return
  }

  senderController
    .sendEmail(message, job.data.email, job.data.name)
    .then(() => {
      done()
    })
    .catch((err) => {
      done(err)
    })
})

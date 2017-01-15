import queue from './utils/queue'
import logger from './utils/logger'
import gm from 'gm'
import path from 'path'
import token from './utils/token'
import TeamScoreController from './controllers/team-score'
import MailgunController from './controllers/mail/mailgun'
import SendGridController from './controllers/mail/sendgrid'
import TeamController from './controllers/team'
import EventController from './controllers/event'
import UpdateTeamLogoEvent from './events/update-team-logo'

let Customizer = require(process.env.THEMIS_CUSTOMIZER_PACKAGE || 'themis-quals-customizer-default').default
let customizer = new Customizer()
let emailGenerator = customizer.getEmailGenerator()

queue('updateScoresQueue').process((job, done) => {
  TeamScoreController.updateScores((err) => {
    if (err) {
      logger.error(err)
      throw err
    } else {
      done()
    }
  })
})

queue('updateTeamScore').process((job, done) => {
  TeamScoreController.updateTeamScore(job.data.teamId, (err) => {
    if (err) {
      logger.error(err)
      throw err
    } else {
      done()
    }
  })
})

queue('createLogoQueue').process((job, done) => {
  let newFilename = path.join(process.env.THEMIS_TEAM_LOGOS_DIR, `team-${job.data.id}.png`)
  gm(job.data.filename)
    .resize(48, 48)
    .write(newFilename, (err) => {
      if (err) {
        logger.error(err)
        throw err
      } else {
        TeamController.get(job.data.id, (err, team) => {
          if (err) {
            logger.error(err)
          } else {
            EventController.push(new UpdateTeamLogoEvent(team))
          }
        })
        done()
      }
    })
})

let secureConnection = false
if (process.env.THEMIS_QUALS_SECURE) {
  secureConnection = process.env.THEMIS_QUALS_SECURE === 'yes'
}

queue('sendEmailQueue').process((job, done) => {
  let message = null
  if (job.data.message === 'welcome') {
    message = emailGenerator.getWelcomeEmail({
      name: job.data.name,
      domain: process.env.THEMIS_DOMAIN,
      secure: secureConnection,
      team: token.encode(job.data.email),
      code: token.encode(job.data.token)
    })
  } else if (job.data.message === 'restore') {
    message = emailGenerator.getRestoreEmail({
      name: job.data.name,
      domain: process.env.THEMIS_DOMAIN,
      secure: secureConnection,
      team: token.encode(job.data.email),
      code: token.encode(job.data.token)
    })
  }

  if (!message) {
    done()
    return
  }

  let senderController = null
  let emailTransport = process.env.THEMIS_EMAIL_TRANSPORT

  if (emailTransport === 'mailgun') {
    senderController = MailgunController
  } else if (emailTransport === 'sendgrid') {
    senderController = SendGridController
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

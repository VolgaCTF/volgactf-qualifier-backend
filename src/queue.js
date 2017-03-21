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

import TaskController from './controllers/task'
import PostController from './controllers/post'
import TwitterController from './controllers/twitter'
import TelegramController from './controllers/telegram'

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

queue('sendEmailQueue').process((job, done) => {
  let secureConnection = false
  if (process.env.THEMIS_QUALS_SECURE) {
    secureConnection = process.env.THEMIS_QUALS_SECURE === 'yes'
  }

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

function getTasksLink () {
  const prefix = (process.env.THEMIS_QUALS_SECURE === 'yes') ? 'https' : 'http'
  const fqdn = process.env.THEMIS_DOMAIN
  return `${prefix}://${fqdn}/tasks`
}

queue('notifyStartCompetition').process((job, done) => {
  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_NEWS === 'yes') {
    PostController.create(
      `Competition has begun!`,
      `:triangular_flag_on_post: Check out [tasks](${getTasksLink()}) and good luck!`,
      (err, post) => {
      }
    )
  }

  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TWITTER === 'yes') {
    TwitterController.post(
      `🚩 Competition has begun! Good luck! ${getTasksLink()}`,
      (err) => {
      }
    )
  }

  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TELEGRAM === 'yes') {
    TelegramController.post(
      `🚩 Competition has begun! Check out [tasks](${getTasksLink()}) and good luck!`,
      (err) => {
      }
    )
  }

  done()
})

function getScoreboardLink () {
  const prefix = (process.env.THEMIS_QUALS_SECURE === 'yes') ? 'https' : 'http'
  const fqdn = process.env.THEMIS_DOMAIN
  return `${prefix}://${fqdn}/scoreboard`
}

queue('notifyFinishCompetition').process((job, done) => {
  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_NEWS === 'yes') {
    PostController.create(
      `Competition has ended!`,
      `:triangular_flag_on_post: Check out the final [scoreboard](${getScoreboardLink()})!`,
      (err, post) => {
      }
    )
  }

  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TWITTER === 'yes') {
    TwitterController.post(
      `🚩 Competition has ended! Check out the final scoreboard! ${getScoreboardLink()}`,
      (err) => {
      }
    )
  }

  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TELEGRAM === 'yes') {
    TelegramController.post(
      `🚩 Competition has ended! Check out the final [scoreboard](${getScoreboardLink()})!`,
      (err) => {
      }
    )
  }

  done()
})

queue('notifyOpenTask').process((job, done) => {
  TaskController.get(job.data.taskId, (err, task) => {
    if (err) {
      done(err)
    } else {
      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_NEWS === 'yes') {
        PostController.create(
          `New task — ${task.title}`,
          `:triangular_flag_on_post: Check out a new task — [${task.title}](${TaskController.getTaskLink(task.id)}), which is worth ${task.value} points!`,
          (err, post) => {
          }
        )
      }

      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TWITTER === 'yes') {
        TwitterController.post(
          `🚩 New task — ${task.title} — worth ${task.value} pts! ${TaskController.getTaskLink(task.id)}`,
          (err) => {
          }
        )
      }

      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TELEGRAM === 'yes') {
        TelegramController.post(
          `🚩 Check out a new task - [${task.title}](${TaskController.getTaskLink(task.id)}), which is worth ${task.value} points!`,
          (err) => {
          }
        )
      }

      done()
    }
  })
})

queue('notifyTaskHint').process((job, done) => {
  TaskController.get(job.data.taskId, (err, task) => {
    if (err) {
      done(err)
    } else {
      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_NEWS === 'yes') {
        PostController.create(
          `Task ${task.title} — new hint!`,
          `:triangular_flag_on_post: Check out a new hint for [${task.title}](${TaskController.getTaskLink(task.id)})!`,
          (err, post) => {
          }
        )
      }

      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TWITTER === 'yes') {
        TwitterController.post(
          `🚩 Task ${task.title} — new hint! ${TaskController.getTaskLink(task.id)}`,
          (err) => {
          }
        )
      }

      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TELEGRAM === 'yes') {
        TelegramController.post(
          `🚩 Check out a new hint for [${task.title}](${TaskController.getTaskLink(task.id)})!`,
          (err) => {
          }
        )
      }

      done()
    }
  })
})

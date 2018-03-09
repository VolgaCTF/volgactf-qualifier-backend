const queue = require('./utils/queue')
const logger = require('./utils/logger')
const gm = require('gm')
const path = require('path')
const token = require('./utils/token')
const TeamScoreController = require('./controllers/team-score')
const MailgunController = require('./controllers/mail/mailgun')
const TeamController = require('./controllers/team')
const EventController = require('./controllers/event')
const UpdateTeamLogoEvent = require('./events/update-team-logo')

const TaskController = require('./controllers/task')
const PostController = require('./controllers/post')
const TwitterController = require('./controllers/twitter')
const TelegramController = require('./controllers/telegram')

const ContestController = require('./controllers/contest')

const EmailGenerator = require('./utils/email-generator')

const emailGenerator = new EmailGenerator()

const messageController = require('./controllers/message')

queue('updateScoresQueue').process(function (job, done) {
  TeamScoreController.updateScores(function (err) {
    if (err) {
      logger.error(err)
      throw err
    } else {
      done()
    }
  })
})

queue('checkContestQueue').process(function (job, done) {
  ContestController.checkUpdate(function (err, contest) {
    if (err) {
      logger.error(err)
      throw err
    } else {
      done()
    }
  })
})

queue('updateTeamScore').process(function (job, done) {
  TeamScoreController.updateTeamScore(job.data.teamId, function (err) {
    if (err) {
      logger.error(err)
      throw err
    } else {
      done()
    }
  })
})

queue('createLogoQueue').process(function (job, done) {
  let newFilename = path.join(process.env.THEMIS_QUALS_TEAM_LOGOS_DIR, `team-${job.data.id}.png`)
  gm(job.data.filename)
    .resize(48, 48)
    .write(newFilename, function (err) {
      if (err) {
        logger.error(err)
        throw err
      } else {
        TeamController.get(job.data.id, function (err, team) {
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

queue('sendEmailQueue').process(function (job, done) {
  emailGenerator
    .init()
    .then(function () {
      let secureConnection = false
      if (process.env.THEMIS_QUALS_SECURE) {
        secureConnection = process.env.THEMIS_QUALS_SECURE === 'yes'
      }

      let message = null
      if (job.data.message === 'welcome') {
        message = emailGenerator.getWelcomeEmail({
          name: job.data.name,
          domain: process.env.THEMIS_QUALS_FQDN,
          secure: secureConnection,
          team: token.encode(job.data.email),
          code: token.encode(job.data.token)
        })
      } else if (job.data.message === 'restore') {
        message = emailGenerator.getRestoreEmail({
          name: job.data.name,
          domain: process.env.THEMIS_QUALS_FQDN,
          secure: secureConnection,
          team: token.encode(job.data.email),
          code: token.encode(job.data.token)
        })
      }

      if (!message) {
        done()
        return
      }

      messageController.create({
        message: message,
        recipientEmail: job.data.email,
        recipientName: job.data.name,
        teamId: job.data.teamId,
        supervisorId: job.data.supervisorId
      })
      .then(function (messageEntity) {
        let senderController = null
        const emailTransport = process.env.THEMIS_QUALS_EMAIL_TRANSPORT

        if (emailTransport === 'mailgun') {
          senderController = MailgunController
        }

        if (!senderController) {
          done()
          return
        }

        senderController
          .sendEmail(message, job.data.email, job.data.name, messageEntity.id)
          .then(function (response) {
            messageController.update({
              id: messageEntity.id,
              status: response
            })
            .then(function () {
              done()
            })
            .catch(function (err3) {
              logger.error(err3)
              done()
            })
          })
          .catch(function (err4) {
            messageController.update({
              id: messageEntity.id,
              status: err4
            })
            .then(function () {
              done(err4)
            })
            .catch(function (err5) {
              logger.error(err5)
              done(err4)
            })
          })
      })
      .catch(function (err2) {
        done(err2)
      })
    })
    .catch(function (err) {
      done(err)
    })
})

function getTasksLink () {
  const prefix = (process.env.THEMIS_QUALS_SECURE === 'yes') ? 'https' : 'http'
  const fqdn = process.env.THEMIS_QUALS_FQDN
  return `${prefix}://${fqdn}/tasks`
}

queue('notifyStartCompetition').process(function (job, done) {
  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_NEWS === 'yes') {
    PostController.create(
      `Competition has begun!`,
      `:triangular_flag_on_post: Check out [tasks](${getTasksLink()}) and good luck!`,
      function (err, post) {
        if (err) {
          logger.error(err)
        }
      }
    )
  }

  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TWITTER === 'yes') {
    TwitterController.post(
      `🚩 Competition has begun! Good luck! ${getTasksLink()}`,
      function (err) {
        if (err) {
          logger.error(err)
        }
      }
    )
  }

  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TELEGRAM === 'yes') {
    TelegramController.post(
      `🚩 Competition has begun! Check out [tasks](${getTasksLink()}) and good luck!`,
      function (err) {
        if (err) {
          logger.error(err)
        }
      }
    )
  }

  done()
})

function getScoreboardLink () {
  const prefix = (process.env.THEMIS_QUALS_SECURE === 'yes') ? 'https' : 'http'
  const fqdn = process.env.THEMIS_QUALS_FQDN
  return `${prefix}://${fqdn}/scoreboard`
}

queue('notifyFinishCompetition').process(function (job, done) {
  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_NEWS === 'yes') {
    PostController.create(
      `Competition has ended!`,
      `:triangular_flag_on_post: Check out the final [scoreboard](${getScoreboardLink()})!`,
      function (err, post) {
        if (err) {
          logger.error(err)
        }
      }
    )
  }

  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TWITTER === 'yes') {
    TwitterController.post(
      `🚩 Competition has ended! Check out the final scoreboard! ${getScoreboardLink()}`,
      function (err) {
        if (err) {
          logger.error(err)
        }
      }
    )
  }

  if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TELEGRAM === 'yes') {
    TelegramController.post(
      `🚩 Competition has ended! Check out the final [scoreboard](${getScoreboardLink()})!`,
      function (err) {
        if (err) {
          logger.error(err)
        }
      }
    )
  }

  done()
})

queue('notifyOpenTask').process(function (job, done) {
  TaskController.get(job.data.taskId, function (err, task) {
    if (err) {
      done(err)
    } else {
      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_NEWS === 'yes') {
        PostController.create(
          `New task — ${task.title}`,
          `:triangular_flag_on_post: Check out a new task — [${task.title}](${TaskController.getTaskLink(task.id)}), which is worth ${task.value} points!`,
          function (err, post) {
            if (err) {
              logger.error(err)
            }
          }
        )
      }

      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TWITTER === 'yes') {
        TwitterController.post(
          `🚩 New task — ${task.title} — worth ${task.value} pts! ${TaskController.getTaskLink(task.id)}`,
          function (err) {
            if (err) {
              logger.error(err)
            }
          }
        )
      }

      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TELEGRAM === 'yes') {
        TelegramController.post(
          `🚩 Check out a new task - [${task.title}](${TaskController.getTaskLink(task.id)}), which is worth ${task.value} points!`,
          function (err) {
            if (err) {
              logger.error(err)
            }
          }
        )
      }

      done()
    }
  })
})

queue('notifyTaskHint').process(function (job, done) {
  TaskController.get(job.data.taskId, function (err, task) {
    if (err) {
      done(err)
    } else {
      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_NEWS === 'yes') {
        PostController.create(
          `Task ${task.title} — new hint!`,
          `:triangular_flag_on_post: Check out a new hint for [${task.title}](${TaskController.getTaskLink(task.id)})!`,
          function (err, post) {
            if (err) {
              logger.error(err)
            }
          }
        )
      }

      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TWITTER === 'yes') {
        TwitterController.post(
          `🚩 Task ${task.title} — new hint! ${TaskController.getTaskLink(task.id)}`,
          function (err) {
            if (err) {
              logger.error(err)
            }
          }
        )
      }

      if (process.env.THEMIS_QUALS_NOTIFICATION_POST_TELEGRAM === 'yes') {
        TelegramController.post(
          `🚩 Check out a new hint for [${task.title}](${TaskController.getTaskLink(task.id)})!`,
          function (err) {
            if (err) {
              logger.error(err)
            }
          }
        )
      }

      done()
    }
  })
})

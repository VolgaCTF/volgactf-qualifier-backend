const _ = require('underscore')

const queue = require('./utils/queue')
const logger = require('./utils/logger')
const gm = require('gm')
const path = require('path')
const token = require('./utils/token')

const MailgunController = require('./controllers/mail/mailgun')
const SMTPController = require('./controllers/mail/smtp')

const TeamController = require('./controllers/team')
const EventController = require('./controllers/event')
const UpdateTeamLogoEvent = require('./events/update-team-logo')

const TaskController = require('./controllers/task')
const TaskValueController = require('./controllers/task-value')
const PostController = require('./controllers/post')
const TwitterController = require('./controllers/twitter')
const telegramController = require('./controllers/telegram')

const ContestController = require('./controllers/contest')

const EmailGenerator = require('./utils/email-generator')

const emailGenerator = new EmailGenerator()

const messageController = require('./controllers/message')

const recalculateController = require('./controllers/recalculate')

const TeamTaskReviewController = require('./controllers/team-task-review')
const SupervisorController = require('./controllers/supervisor')
const supervisorTaskSubscriptionController = require('./controllers/supervisor-task-subscription')

const requestretry = require('requestretry')

queue('recalculateQueue').process(function (job, done) {
  recalculateController
  .recalculate()
  .then(function () {
    done()
  })
  .catch(function (err) {
    logger.error(err)
    done(err)
  })
})

queue('checkContestQueue').process(function (job, done) {
  ContestController.checkUpdate(function (err, contest) {
    if (err) {
      logger.error(err)
      done(err)
    } else {
      done()
    }
  })
})

queue('checkTasksQueue').process(function (job, done) {
  TaskController
  .checkUnopened()
  .then(function () {
    done()
  })
  .catch(function (err) {
    logger.error(err)
    done(err)
  })
})

queue('createLogoQueue').process(function (job, done) {
  let newFilename = path.join(process.env.VOLGACTF_QUALIFIER_TEAM_LOGOS_DIR, `${job.data.id}.png`)
  gm(job.data.filename)
    .resize(48, 48)
    .write(newFilename, function (err) {
      if (err) {
        logger.error(err)
        done(err)
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

function getTeamLink (teamId) {
  const prefix = (process.env.VOLGACTF_QUALIFIER_SECURE === 'yes') ? 'https' : 'http'
  const fqdn = process.env.VOLGACTF_QUALIFIER_FQDN
  return `${prefix}://${fqdn}/team/${teamId}/profile`
}

function getTaskStatisticsLink (taskId) {
  const prefix = (process.env.VOLGACTF_QUALIFIER_SECURE === 'yes') ? 'https' : 'http'
  const fqdn = process.env.VOLGACTF_QUALIFIER_FQDN
  return `${prefix}://${fqdn}/task/${taskId}/statistics`
}

queue('newTaskReviewQueue').process(function (job, done) {
  let teamTaskReview = null
  let task = null
  let supervisorTaskSubscriptions = []
  let supervisors = []
  let team = null

  TeamTaskReviewController
  .get(job.data.reviewId)
  .then(function (model) {
    teamTaskReview = model
    return TaskController.fetchOne(teamTaskReview.taskId)
  })
  .then(function (model) {
    task = model
    return supervisorTaskSubscriptionController.fetchForTask(task.id)
  })
  .then(function (models) {
    supervisorTaskSubscriptions = models
    return SupervisorController.fetchByIdList(supervisorTaskSubscriptions.map(function (x) {
      return x.supervisorId
    }))
  })
  .then(function (models) {
    supervisors = models
    return TeamController.fetchOne(teamTaskReview.teamId)
  })
  .then(function (model) {
    team = model
    const teamLink = getTeamLink(team.id)
    const taskLink = TaskController.getTaskLink(task.id)
    const taskStatisticsLink = getTaskStatisticsLink(task.id)
    for (const item of supervisorTaskSubscriptions) {
      const supervisor = _.findWhere(supervisors, { id: item.supervisorId })
      queue('sendEmailQueue').add({
        message: 'new_task_review',
        name: supervisor.username,
        email: supervisor.email,
        supervisorId: supervisor.id,
        team_name: team.name,
        team_link: teamLink,
        task_title: task.title,
        task_link: taskLink,
        task_statistics_link: taskStatisticsLink,
        review_rating: teamTaskReview.rating,
        review_comment: teamTaskReview.comment
      })
    }
    done()
  })
  .catch(function (err) {
    logger.error(err)
    done(err)
  })
})

queue('sendEmailQueue').process(function (job, done) {
  emailGenerator
  .init()
  .then(function () {
    let message = null
    if (job.data.message === 'welcome') {
      message = emailGenerator.getWelcomeEmail({
        name: job.data.name,
        email_confirm_link: job.data.email_confirm_link
      })
    } else if (job.data.message === 'restore') {
      message = emailGenerator.getRestoreEmail({
        name: job.data.name,
        password_reset_link: job.data.password_reset_link
      })
    } else if (job.data.message === 'invite_supervisor') {
      message = emailGenerator.getInviteSupervisorEmail({
        create_account_link: job.data.create_account_link,
        rights: job.data.rights
      })
    } else if (job.data.message === 'new_task_review') {
      message = emailGenerator.getNewTaskReviewEmail({
        name: job.data.name,
        team_name: job.data.team_name,
        team_link: job.data.team_link,
        task_title: job.data.task_title,
        task_link: job.data.task_link,
        task_statistics_link: job.data.task_statistics_link,
        review_rating: job.data.review_rating,
        review_comment: job.data.review_comment
      })
    }

    if (!message) {
      done()
      return
    }

    messageController.create({
      message: message,
      recipientEmail: job.data.email,
      recipientName: job.data.name || '',
      teamId: job.data.teamId,
      supervisorId: job.data.supervisorId
    })
    .then(function (messageEntity) {
      let senderController = null
      const emailTransport = process.env.VOLGACTF_QUALIFIER_EMAIL_TRANSPORT

      if (emailTransport === 'mailgun') {
        senderController = MailgunController
      } else if (emailTransport === 'smtp') {
        senderController = SMTPController
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
      logger.error(err2)
      done(err2)
    })
  })
  .catch(function (err) {
    logger.error(err)
    done(err)
  })
})

function getTasksLink () {
  const prefix = (process.env.VOLGACTF_QUALIFIER_SECURE === 'yes') ? 'https' : 'http'
  const fqdn = process.env.VOLGACTF_QUALIFIER_FQDN
  return `${prefix}://${fqdn}/tasks`
}

queue('notifyStartCompetition').process(function (job, done) {
  if (process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_NEWS === 'yes') {
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

  if (process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_TWITTER === 'yes') {
    TwitterController.post(
      `🚩 Competition has begun! Good luck! ${getTasksLink()}`,
      function (err) {
        if (err) {
          logger.error(err)
        }
      }
    )
  }

  if (process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_TELEGRAM === 'yes') {
    telegramController
    .post(`🚩 Competition has begun! Check out [tasks](${getTasksLink()}) and good luck!`)
    .then(function () {
    })
    .catch(function (err) {
      logger.error(err)
    })
  }

  done()
})

function getScoreboardLink () {
  const prefix = (process.env.VOLGACTF_QUALIFIER_SECURE === 'yes') ? 'https' : 'http'
  const fqdn = process.env.VOLGACTF_QUALIFIER_FQDN
  return `${prefix}://${fqdn}/scoreboard`
}

queue('notifyFinishCompetition').process(function (job, done) {
  if (process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_NEWS === 'yes') {
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

  if (process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_TWITTER === 'yes') {
    TwitterController.post(
      `🚩 Competition has ended! Check out the final scoreboard! ${getScoreboardLink()}`,
      function (err) {
        if (err) {
          logger.error(err)
        }
      }
    )
  }

  if (process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_TELEGRAM === 'yes') {
    telegramController
    .post(`🚩 Competition has ended! Check out the final [scoreboard](${getScoreboardLink()})!`)
    .then(function () {
    })
    .catch(function (err) {
      logger.error(err)
    })
  }

  done()
})

queue('notifyOpenTask').process(function (job, done) {
  Promise
  .all([
    TaskController.fetchOne(job.data.taskId),
    TaskValueController.getByTaskId(job.data.taskId)
  ])
  .then(function (values) {
    const task = values[0]
    const taskValue = values[1]

    if (process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_NEWS === 'yes') {
      PostController.create(
        `New task — ${task.title}`,
        `:triangular_flag_on_post: Check out a new task — [${task.title}](${TaskController.getTaskLink(task.id)}), which is worth ${taskValue.value} points!`,
        function (err, post) {
          if (err) {
            logger.error(err)
          }
        }
      )
    }

    if (process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_TWITTER === 'yes') {
      TwitterController.post(
        `🚩 New task — ${task.title} — worth ${taskValue.value} pts! ${TaskController.getTaskLink(task.id)}`,
        function (err) {
          if (err) {
            logger.error(err)
          }
        }
      )
    }

    if (process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_TELEGRAM === 'yes') {
      telegramController
      .post(`🚩 Check out a new task - [${task.title}](${TaskController.getTaskLink(task.id)}), which is worth ${taskValue.value} points!`)
      .then(function () {
      })
      .catch(function (err) {
        logger.error(err)
      })
    }

    done()
  })
  .catch(function (err) {
    done(err)
  })
})

queue('notifyTaskHint').process(function (job, done) {
  TaskController.get(job.data.taskId, function (err, task) {
    if (err) {
      done(err)
    } else {
      if (task.isOpened() && process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_NEWS === 'yes') {
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

      if (task.isOpened() && process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_TWITTER === 'yes') {
        TwitterController.post(
          `🚩 Task ${task.title} — new hint! ${TaskController.getTaskLink(task.id)}`,
          function (err) {
            if (err) {
              logger.error(err)
            }
          }
        )
      }

      if (task.isOpened() && process.env.VOLGACTF_QUALIFIER_NOTIFICATION_POST_TELEGRAM === 'yes') {
        telegramController
        .post(`🚩 Check out a new hint for [${task.title}](${TaskController.getTaskLink(task.id)})!`)
        .then(function () {
        })
        .catch(function (err) {
          logger.error(err)
        })
      }

      done()
    }
  })
})

queue('subscribeAwsSns').process(function (job, done) {
  requestretry({
    method: 'GET',
    url: job.data.url,
    maxAttempts: 3,
    retryDelay: 100,
    timeout: 3000
  }, function (err, res) {
    if (err) {
      done(err)
    } else {
      if (res.statusCode === 200) {
        done()
      } else {
        done(new Error(`expected 200 status code, received: ${res.statusCode}`))
      }
    }
  })
})

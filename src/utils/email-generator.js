const mustache = require('mustache')
const async = require('async')
const axios = require('axios')

class EmailGenerator {
  constructor () {
    this.templates = {}
    this.loaded = false
  }

  init () {
    return new Promise((resolve, reject) => {
      if (this.loaded) {
        resolve(true)
      } else {
        const fetchFunc = function (url, next) {
          axios.get(url)
            .then(function (response) {
              next(null, response.data)
            })
            .catch(function (error) {
              next(error, null)
            })
        }

        const customizerHost = process.env.THEMIS_QUALS_CUSTOMIZER_HOST
        const customizerPort = parseInt(process.env.THEMIS_QUALS_CUSTOMIZER_PORT, 10)
        async.map([
          `http://${customizerHost}:${customizerPort}/mail/welcome/subject`,
          `http://${customizerHost}:${customizerPort}/mail/welcome/plain`,
          `http://${customizerHost}:${customizerPort}/mail/welcome/html`,
          `http://${customizerHost}:${customizerPort}/mail/restore/subject`,
          `http://${customizerHost}:${customizerPort}/mail/restore/plain`,
          `http://${customizerHost}:${customizerPort}/mail/restore/html`,
          `http://${customizerHost}:${customizerPort}/mail/invite_supervisor/subject`,
          `http://${customizerHost}:${customizerPort}/mail/invite_supervisor/plain`,
          `http://${customizerHost}:${customizerPort}/mail/invite_supervisor/html`,
          `http://${customizerHost}:${customizerPort}/mail/new_task_review/subject`,
          `http://${customizerHost}:${customizerPort}/mail/new_task_review/plain`,
          `http://${customizerHost}:${customizerPort}/mail/new_task_review/html`,
        ], fetchFunc, (err, results) => {
          if (err) {
            reject(err)
          }
          this.templates = {
            welcome: {
              subject: results[0],
              plain: results[1],
              html: results[2]
            },
            restore: {
              subject: results[3],
              plain: results[4],
              html: results[5]
            },
            inviteSupervisor: {
              subject: results[6],
              plain: results[7],
              html: results[8]
            },
            newTaskReview: {
              subject: results[9],
              plain: results[10],
              html: results[11]
            }
          }
          this.loaded = true
          resolve(true)
        })
      }
    })
  }

  getWelcomeEmail (params) {
    let plainMessage = mustache.render(this.templates['welcome']['plain'], params)
    let htmlMessage = mustache.render(this.templates['welcome']['html'], params)

    return {
      subject: this.templates['welcome']['subject'],
      plain: plainMessage,
      html: htmlMessage
    }
  }

  getRestoreEmail (params) {
    let plainMessage = mustache.render(this.templates['restore']['plain'], params)
    let htmlMessage = mustache.render(this.templates['restore']['html'], params)

    return {
      subject: this.templates['restore']['subject'],
      plain: plainMessage,
      html: htmlMessage
    }
  }

  getInviteSupervisorEmail (params) {
    let plainMessage = mustache.render(this.templates['inviteSupervisor']['plain'], params)
    let htmlMessage = mustache.render(this.templates['inviteSupervisor']['html'], params)

    return {
      subject: this.templates['inviteSupervisor']['subject'],
      plain: plainMessage,
      html: htmlMessage
    }
  }

  getNewTaskReviewEmail (params) {
    const entry = this.templates.newTaskReview
    return {
      subject: mustache.render(entry.subject, params),
      plain: mustache.render(entry.plain, params),
      html: mustache.render(entry.html, params)
    }
  }
}

module.exports = EmailGenerator

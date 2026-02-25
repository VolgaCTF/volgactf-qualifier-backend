const mustache = require('mustache')
const async = require('async')
const path = require('path')
const fs = require('fs')
const logger = require('./logger')

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
        const emailTemplatesVersion = process.env.VOLGACTF_QUALIFIER_EMAIL_TEMPLATES_VERSION || 'default'
        const emailTemplatesRoot = path.join('email-templates', emailTemplatesVersion)

        const loadFunc = function (relativePath, next) {
          const fullPath = path.join(emailTemplatesRoot, relativePath)
          fs.readFile(fullPath, 'utf8', function (err, data) {
            if (err) {
              logger.error(err)
              next(error, null)
            }

            next(null, data.trim())
          })
        }

        async.map([
          'welcome.subject.mustache',
          'welcome.plain.mustache',
          'welcome.html.mustache',
          'restore.subject.mustache',
          'restore.plain.mustache',
          'restore.html.mustache',
          'invite_supervisor.subject.mustache',
          'invite_supervisor.plain.mustache',
          'invite_supervisor.html.mustache',
          'new_task_review.subject.mustache',
          'new_task_review.plain.mustache',
          'new_task_review.html.mustache',
        ], loadFunc, (err, results) => {
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
    return this.renderEntry('welcome', params)
  }

  getRestoreEmail (params) {
    return this.renderEntry('restore', params)
  }

  getInviteSupervisorEmail (params) {
    return this.renderEntry('inviteSupervisor', params)
  }

  getNewTaskReviewEmail (params) {
    return this.renderEntry('newTaskReview', params)
  }

  renderEntry (entryName, params) {
    const entry = this.templates[entryName]
    return {
      subject: mustache.render(entry.subject, params),
      plain: mustache.render(entry.plain, params),
      html: mustache.render(entry.html, params)
    }
  }
}

module.exports = EmailGenerator

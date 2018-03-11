const path = require('path')
const fs = require('fs')
const _ = require('underscore')

const logger = require('./logger')
const { TemplateNotRegisteredError, InternalError } = require('./errors')

class TemplateStore {
  constructor () {
    this.cache = {}
    this.metadata = {}
    this.distFrontendDir = process.env.THEMIS_QUALS_DIST_FRONTEND_DIR
  }

  register (templateId, templateSrcPath) {
    this.metadata[templateId] = path.join(this.distFrontendDir, templateSrcPath)
  }

  resolveOne (templateId) {
    return new Promise((resolve, reject) => {
      if (!this.cache.hasOwnProperty(templateId)) {
        if (!this.metadata.hasOwnProperty(templateId)) {
          reject(new TemplateNotRegisteredError(`Template "${templateId}" is not available!`))
        } else {
          fs.readFile(this.metadata[templateId], 'utf8', (err, data) => {
            if (err) {
              logger.error(err)
              reject(new InternalError())
            } else {
              this.cache[templateId] = _.template(data)
              resolve(this.cache[templateId])
            }
          })
        }
      } else {
        resolve(this.cache[templateId])
      }
    })
  }

  resolveAll (templateIdList) {
    return new Promise((resolve, reject) => {
      const promises = _.map(templateIdList, (templateId) => {
        return this.resolveOne(templateId)
      })

      Promise
      .all(promises)
      .then(function (values) {
        const result = {}
        _.each(templateIdList, function (templateId, ndx) {
          result[templateId] = values[ndx]
        })
        resolve(result)
      })
      .catch(function (err) {
        reject(err)
      })
    })
  }
}

module.exports = new TemplateStore()

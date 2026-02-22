const path = require('path')
const fs = require('fs')
const _ = require('underscore')

const logger = require('./logger')
const { TemplateNotRegisteredError, InternalError } = require('./errors')

class TemplateStore {
  constructor () {
    this.cache = {}
    this.metadata = {}
    this.frontendDistDir = process.env.VOLGACTF_QUALIFIER_FRONTEND_DIST_DIR
    this.templateCheckMtime = process.env.VOLGACTF_QUALIFIER_TEMPLATE_CHECK_MTIME === 'yes'
  }

  register (templateId, templateSrcPath) {
    this.metadata[templateId] = path.join(this.frontendDistDir, templateSrcPath)
  }

  updateTemplate (templateId, resolve, reject) {
    fs.readFile(this.metadata[templateId], 'utf8', (err, data) => {
      if (err) {
        logger.error(err)
        reject(new InternalError())
      } else {
        this.cache[templateId] = {
          template: _.template(data),
          lastUpdated: new Date()
        }
        resolve(this.cache[templateId].template)
      }
    })
  }

  resolveOne (templateId) {
    return new Promise((resolve, reject) => {
      if (!Object.hasOwn(this.cache, templateId)) {
        if (!Object.hasOwn(this.metadata, templateId)) {
          reject(new TemplateNotRegisteredError(`Template "${templateId}" is not available!`))
        } else {
          this.updateTemplate(templateId, resolve, reject)
        }
      } else {
        if (this.templateCheckMtime) {
          fs.stat(this.metadata[templateId], (err, stat) => {
            if (err) {
              logger.error(err)
              reject(new InternalError())
            } else {
              if (stat.mtime > this.cache[templateId].lastUpdated) {
                this.updateTemplate(templateId, resolve, reject)
              } else {
                resolve(this.cache[templateId].template)
              }
            }
          })
        } else {
          resolve(this.cache[templateId].template)
        }
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

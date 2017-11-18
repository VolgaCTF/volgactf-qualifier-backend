import mustache from 'mustache'
import fs from 'fs'
import path from 'path'
import async from 'async'
import axios from 'axios'

export default class EmailGenerator {
  constructor () {
    this.templates = {}
    this.loaded = false
  }

  init () {
    return new Promise((resolve, reject) => {
      if (this.loaded) {
        resolve(true)
      } else {
        function fetch (url, next) {
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
          `http://${customizerHost}:${customizerPort}/mail/restore/html`
        ], fetch, (err, results) => {
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
            }
          }
          this.loaded = true
          console.log('Initialized')
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
}

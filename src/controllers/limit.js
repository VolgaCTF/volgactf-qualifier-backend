const redis = require('../utils/redis')
const { InternalError } = require('../utils/errors')
const logger = require('../utils/logger')
const _ = require('underscore')
const redisClient = redis.createClient()

class LimitController {
  constructor (key, options = {}) {
    const defaultOptions = {
      timeout: 10,
      maxAttempts: 3
    }

    options = _.extend(defaultOptions, options)
    this.key = key
    this.timeout = options.timeout
    this.maxAttempts = options.maxAttempts
  }

  check (callback) {
    redisClient.incr(this.key, (err, attempts) => {
      if (err) {
        logger.err(err)
        callback(new InternalError(), null)
      } else {
        redisClient.ttl(this.key, (err, ttl) => {
          if (err) {
            logger.error(err)
            callback(new InternalError(), null)
          } else {
            const returnValue = (attempts > this.maxAttempts)
            if (ttl < 0) {
              redisClient.expire(this.key, this.timeout, (err) => {
                if (err) {
                  logger.error(err)
                  callback(new InternalError(), null)
                } else {
                  callback(null, returnValue)
                }
              })
            } else {
              callback(null, returnValue)
            }
          }
        })
      }
    })
  }
}

module.exports = LimitController

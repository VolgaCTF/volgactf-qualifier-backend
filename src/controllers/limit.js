import redis from '../utils/redis'
let redisClient = redis.createClient()
import { InternalError } from '../utils/errors'
import logger from '../utils/logger'
import _ from 'underscore'


class LimitController {
  constructor(key, options = {}) {
    let defaultOptions = {
      timeout: 10,
      maxAttempts: 3
    }

    options = _.extend(defaultOptions, options)
    this.key = key
    this.timeout = options.timeout
    this.maxAttempts = options.maxAttempts
  }

  check(callback) {
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
            let returnValue = (attempts > this.maxAttempts)
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


export default LimitController

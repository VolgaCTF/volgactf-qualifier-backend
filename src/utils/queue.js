const Queue = require('bull')

class QueueManager {
  constructor () {
    this.redisHost = process.env.REDIS_HOST || '127.0.0.1'
    this.redisPort = 6379
    if (process.env.REDIS_PORT) {
      this.redisPort = parseInt(process.env.REDIS_PORT, 10)
    }
    this.redisDatabase = 0
    if (process.env.REDIS_DB) {
      this.redisDatabase = parseInt(process.env.REDIS_DB, 10)
    }

    this.prefix = process.env.THEMIS_QUALS_QUEUE_PREFIX || 'themis-quals'

    this.cache = {}
  }

  getQueue (name) {
    if (!this.cache.hasOwnProperty(name)) {
      this.cache[name] = Queue(
        `${this.prefix}:${name}`,
        this.redisPort,
        this.redisHost,
        { db: this.redisDatabase }
      )
    }

    return this.cache[name]
  }
}

const queueManager = new QueueManager()

module.exports = function (name) {
  return queueManager.getQueue(name)
}

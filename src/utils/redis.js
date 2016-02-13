import redis from 'redis'

let host = process.env.REDIS_HOST || '127.0.0.1'

let port = 6379
if (process.env.REDIS_PORT) {
  port = parseInt(process.env.REDIS_PORT, 10)
}

let database = 0
if (process.env.REDIS_DB) {
  database = parseInt(process.env.REDIS_DB, 10)
}

export default {
  createClient: function () {
    return redis.createClient(port, host, { db: database })
  }
}

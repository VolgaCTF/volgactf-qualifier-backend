const redis = require('./redis')

class EventPublisher {
  constructor (channel) {
    this.client = redis.createClient()
    this.channel = channel
  }

  push (event) {
    let data = {
      id: event.id,
      type: event.type,
      data: event.data,
      createdAt: event.createdAt.getTime()
    }
    return this.client.publish(this.channel, JSON.stringify(data))
  }
}

const redisChannel = process.env.THEMIS_QUALS_STREAM_REDIS_CHANNEL || 'themis_quals_realtime'

module.exports = new EventPublisher(redisChannel)

const redis = require('./redis')

class EventPublisher {
  constructor (channel) {
    this.client = redis.createClient()
    this.channel = channel
  }

  push (event) {
    const data = {
      id: event.id,
      type: event.type,
      data: event.data,
      createdAt: event.createdAt.getTime()
    }
    return this.client.publish(this.channel, JSON.stringify(data))
  }
}

const redisChannel = process.env.VOLGACTF_QUALIFIER_STREAM_REDIS_CHANNEL || 'volgactf_qualifier_realtime'

module.exports = new EventPublisher(redisChannel)

import redis from './redis'

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

let redisChannel = process.env.THEMIS_STREAM_REDIS_CHANNEL || 'themis_realtime'

export default new EventPublisher(redisChannel)

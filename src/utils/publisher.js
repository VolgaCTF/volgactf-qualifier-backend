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
      createdAt: event.createdAt
    }
    return this.client.publish(this.channel, JSON.stringify(data))
  }
}

let channel = process.env.REDIS_REALTIME_CHANNEL || 'themis_realtime'

export default new EventPublisher(channel)

const redis = require('./redis')

class EventSubscriber {
  constructor (channel) {
    this.client = redis.createClient()
    this.client.subscribe(channel)
  }

  on (eventName, callback) {
    this.client.on(eventName, callback)
  }
}

module.exports = EventSubscriber

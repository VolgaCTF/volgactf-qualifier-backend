import redis from './redis'

let client = redis.createClient()

export default {
  subscribe: function(channel) {
    client.subscribe(channel)
  },

  on: function(eventName, callback) {
    client.on(eventName, callback)
  }
}

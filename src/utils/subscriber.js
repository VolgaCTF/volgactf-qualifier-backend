import redis from './redis'

let client = redis.createClient()

export function subscribe(channel) {
  client.subscribe(channel)
}

export function on(eventName, callback) {
  client.on(eventName, callback)
}

import redis from './redis'

let client = redis.createClient()

export default function publish(channel, eventObject) {
  return client.publish(channel, JSON.stringify(eventObject.serialize()))
}

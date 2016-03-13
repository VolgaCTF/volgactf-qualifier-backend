import { EventEmitter } from 'events'
import EventSubscriber from '../utils/subscriber'
import _ from 'underscore'
import eventNameList from '../utils/event-name-list'

class EventStream extends EventEmitter {
  constructor (maxListeners, channel) {
    super()
    this.channel = channel
    this.setMaxListeners(maxListeners)
  }

  format (id, name, retry, obj) {
    return `id: ${id}\nevent: ${name}\nretry: ${retry}\ndata: ${JSON.stringify(obj)}\n\n`
  }

  emitMessage (message) {
    let id = message.id
    let name = eventNameList.getName(message.type)
    let createdAt = message.createdAt

    if (message.data.supervisors) {
      this.emit('message:supervisors', this.format(
        id,
        name,
        5000,
        _.extend(message.data.supervisors, { __metadataCreatedAt: createdAt })
      ))
    }

    if (message.data.teams) {
      this.emit('message:teams', this.format(
        id,
        name,
        5000,
        _.extend(message.data.teams, { __metadataCreatedAt: createdAt })
      ))
    }

    if (message.data.guests) {
      this.emit('message:guests', this.format(
        id,
        name,
        5000,
        _.extend(message.data.guests, { __metadataCreatedAt: createdAt })
      ))
    }

    if (message.data.team) {
      _.each(message.data.team, (teamData, teamId, list) => {
        this.emit(`message:team-${teamId}`, this.format(
          id,
          name,
          5000,
          _.extend(teamData, { __metadataCreatedAt: createdAt })
        ))
      })
    }
  }

  run () {
    let subscriber = new EventSubscriber(this.channel)

    subscriber.on('message', (channel, data) => {
      this.emitMessage(JSON.parse(data))
    })
  }
}

let streamMaxConnections = 1024
if (process.env.THEMIS_STREAM_MAX_CONNECTIONS) {
  streamMaxConnections = parseInt(process.env.THEMIS_STREAM_MAX_CONNECTIONS, 10)
}

let redisChannel = process.env.THEMIS_STREAM_REDIS_CHANNEL || 'themis_realtime'

export default new EventStream(streamMaxConnections, redisChannel)

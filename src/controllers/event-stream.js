const { EventEmitter } = require('events')
const EventSubscriber = require('../utils/subscriber')
const _ = require('underscore')
const eventNameList = require('../utils/event-name-list')

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
    const id = message.id
    const name = eventNameList.getName(message.type)
    const createdAt = message.createdAt

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
    const subscriber = new EventSubscriber(this.channel)

    subscriber.on('message', (channel, data) => {
      this.emitMessage(JSON.parse(data))
    })
  }
}

let streamMaxConnections = 1024
if (process.env.VOLGACTF_QUALIFIER_STREAM_MAX_CONNECTIONS) {
  streamMaxConnections = parseInt(process.env.VOLGACTF_QUALIFIER_STREAM_MAX_CONNECTIONS, 10)
}

const redisChannel = process.env.VOLGACTF_QUALIFIER_STREAM_REDIS_CHANNEL || 'volgactf_qualifier_realtime'

module.exports = new EventStream(streamMaxConnections, redisChannel)

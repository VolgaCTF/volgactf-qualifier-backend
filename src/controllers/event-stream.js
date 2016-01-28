import { EventEmitter } from 'events'
import subscriber from '../utils/subscriber'
import _ from 'underscore'
import logger from '../utils/logger'


class EventStream extends EventEmitter {
  constructor(maxListeners) {
    super()
    this.setMaxListeners(maxListeners)
  }

  format(id, name, retry, obj) {
    return `id: ${id}\nevent: ${name}\nretry: ${retry}\ndata: ${JSON.stringify(obj)}\n\n`
  }

  run() {
    subscriber.subscribe('realtime')
    subscriber.on('message', (channel, data) => {
      let message = JSON.parse(data)

      let name = message.name
      let eventId = (new Date()).getTime()

      let dataForSupervisors = message.data.supervisors
      if (dataForSupervisors) {
        this.emit('message:supervisors', this.format(eventId, name, 5000, dataForSupervisors))
      }

      let dataForTeams = message.data.teams
      if (dataForTeams) {
        this.emit('message:teams', this.format(eventId, name, 5000, dataForTeams))
      }

      let dataForGuests = message.data.guests
      if (dataForGuests) {
        this.emit('message:guests', this.format(eventId, name, 5000, dataForGuests))
      }

      _.each(message.data.team, (dataForTeam, teamId, list) => {
        this.emit(`message:team${teamId}`, this.format(eventId, name, 5000, dataForTeam))
      })
    })
  }
}


let maxStreamConnections = 1024
if (process.env.MAX_STREAM_CONNECTIONS) {
  maxStreamConnections = parseInt(process.env.MAX_STREAM_CONNECTIONS, 10)
}


export default new EventStream(maxStreamConnections)

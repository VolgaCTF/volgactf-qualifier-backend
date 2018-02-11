const BaseEvent = require('./base')
const { EVENT_QUALIFY_TEAM } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class QualifyTeamEvent extends BaseEvent {
  constructor (team) {
    const publicData = teamSerializer(team)
    const data = teamSerializer(team, { exposeEmail: true })
    super(EVENT_QUALIFY_TEAM, data, publicData, publicData, {})
  }
}

module.exports = QualifyTeamEvent

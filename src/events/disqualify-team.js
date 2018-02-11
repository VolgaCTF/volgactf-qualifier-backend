const BaseEvent = require('./base')
const { EVENT_DISQUALIFY_TEAM } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class DisqualifyTeamEvent extends BaseEvent {
  constructor (team) {
    const publicData = teamSerializer(team)
    const data = teamSerializer(team, { exposeEmail: true })
    super(EVENT_DISQUALIFY_TEAM, data, publicData, publicData, {})
  }
}

module.exports = DisqualifyTeamEvent

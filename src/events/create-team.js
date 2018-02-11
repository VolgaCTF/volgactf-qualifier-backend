const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_TEAM } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class CreateTeamEvent extends SupervisorEvent {
  constructor (team) {
    super(EVENT_CREATE_TEAM, teamSerializer(team, { exposeEmail: true }))
  }
}

module.exports = CreateTeamEvent

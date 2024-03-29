const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_TEAM } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class CreateTeamEvent extends SupervisorEvent {
  constructor (team, ctftime) {
    super(EVENT_CREATE_TEAM, {
      team: teamSerializer(team, { exposeEmail: true }),
      ctftime
    })
  }
}

module.exports = CreateTeamEvent

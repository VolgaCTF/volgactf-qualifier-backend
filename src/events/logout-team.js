const SupervisorEvent = require('./supervisor')
const { EVENT_LOGOUT_TEAM } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class LogoutTeamEvent extends SupervisorEvent {
  constructor (team) {
    super(EVENT_LOGOUT_TEAM, teamSerializer(team, { exposeEmail: true }))
  }
}

module.exports = LogoutTeamEvent

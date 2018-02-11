const SupervisorEvent = require('./supervisor')
const { EVENT_LOGIN_TEAM } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class LoginTeamEvent extends SupervisorEvent {
  constructor (team) {
    super(EVENT_LOGIN_TEAM, teamSerializer(team, { exposeEmail: true }))
  }
}

module.exports = LoginTeamEvent

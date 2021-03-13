const SupervisorEvent = require('./supervisor')
const { EVENT_LINK_TEAM_CTFTIME } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class LinkTeamCTFtimeEvent extends SupervisorEvent {
  constructor (team, ctftime) {
    super(EVENT_LINK_TEAM_CTFTIME, {
      team: teamSerializer(team, { exposeEmail: true }),
      ctftime: ctftime
    })
  }
}

module.exports = LinkTeamCTFtimeEvent

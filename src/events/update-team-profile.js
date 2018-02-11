const BaseEvent = require('./base')
const { EVENT_UPDATE_TEAM_PROFILE } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class UpdateTeamProfileEvent extends BaseEvent {
  constructor (team) {
    const data = teamSerializer(team, { exposeEmail: true })
    let publicData = null
    const teamData = {}
    if (team.emailConfirmed) {
      publicData = teamSerializer(team)
    } else {
      teamData[team.id] = data
    }

    super(EVENT_UPDATE_TEAM_PROFILE, data, publicData, publicData, teamData)
  }
}

module.exports = UpdateTeamProfileEvent

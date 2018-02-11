const BaseEvent = require('./base')
const { EVENT_UPDATE_TEAM_EMAIL } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class UpdateTeamEmailEvent extends BaseEvent {
  constructor (team) {
    const data = teamSerializer(team, { exposeEmail: true })
    const teamData = {}
    teamData[team.id] = data

    super(EVENT_UPDATE_TEAM_EMAIL, data, null, null, teamData)
  }
}

module.exports = UpdateTeamEmailEvent

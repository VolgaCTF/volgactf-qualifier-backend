const BaseEvent = require('./base')
const { EVENT_UPDATE_TEAM_PASSWORD } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class UpdateTeamPasswordEvent extends BaseEvent {
  constructor (team) {
    const data = teamSerializer(team, { exposeEmail: true })
    const teamData = {}
    teamData[team.id] = data

    super(EVENT_UPDATE_TEAM_PASSWORD, data, null, null, teamData)
  }
}

module.exports = UpdateTeamPasswordEvent

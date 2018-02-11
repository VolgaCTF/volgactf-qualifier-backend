const BroadcastEvent = require('./broadcast')
const { EVENT_UPDATE_TEAM_SCORE } = require('../utils/constants')
const teamScoreSerializer = require('../serializers/team-score')

class UpdateTeamScoreEvent extends BroadcastEvent {
  constructor (teamScore) {
    super(EVENT_UPDATE_TEAM_SCORE, teamScoreSerializer(teamScore))
  }
}

module.exports = UpdateTeamScoreEvent

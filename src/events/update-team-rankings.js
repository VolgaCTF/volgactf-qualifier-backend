const _ = require('underscore')
const BroadcastEvent = require('./broadcast')
const { EVENT_UPDATE_TEAM_RANKINGS } = require('../utils/constants')
const teamRankingSerializer = require('../serializers/team-ranking')

class UpdateTeamRankingsEvent extends BroadcastEvent {
  constructor (teamRankings) {
    super(EVENT_UPDATE_TEAM_RANKINGS, {
      collection: _.map(teamRankings, teamRankingSerializer)
    })
  }
}

module.exports = UpdateTeamRankingsEvent

const BaseEvent = require('./base')
const { EVENT_CREATE_TEAM_TASK_REVIEW } = require('../utils/constants')
const teamTaskReviewSerializer = require('../serializers/team-task-review')

class CreateTeamTaskReviewEvent extends BaseEvent {
  constructor (teamTaskReview) {
    const data = teamTaskReviewSerializer(teamTaskReview)
    const teamData = {}
    teamData[teamTaskReview.teamId] = data
    super(EVENT_CREATE_TEAM_TASK_REVIEW, data, null, null, teamData)
  }
}

module.exports = CreateTeamTaskReviewEvent

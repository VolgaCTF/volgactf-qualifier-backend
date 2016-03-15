import BaseEvent from './base'
import constants from '../utils/constants'
import teamTaskReviewSerializer from '../serializers/team-task-review'

export default class CreateTeamTaskReviewEvent extends BaseEvent {
  constructor (teamTaskReview) {
    let data = teamTaskReviewSerializer(teamTaskReview)
    let teamData = {}
    teamData[teamTaskReview.teamId] = data
    super(constants.EVENT_CREATE_TEAM_TASK_REVIEW, data, null, null, teamData)
  }
}

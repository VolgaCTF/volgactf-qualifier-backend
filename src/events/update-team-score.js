import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import teamScoreSerializer from '../serializers/team-score'

export default class UpdateTeamScoreEvent extends BroadcastEvent {
  constructor (teamScore) {
    super(constants.EVENT_UPDATE_TEAM_SCORE, teamScoreSerializer(teamScore))
  }
}

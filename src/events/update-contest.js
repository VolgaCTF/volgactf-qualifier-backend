import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import contestSerializer from '../serializers/contest'

export default class UpdateContestEvent extends BroadcastEvent {
  constructor (contest) {
    super(constants.EVENT_UPDATE_CONTEST, contestSerializer(contest))
  }
}

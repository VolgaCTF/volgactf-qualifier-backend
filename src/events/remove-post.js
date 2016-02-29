import BroadcastEvent from './broadcast'
import constants from '../utils/constants'

export default class RemovePostEvent extends BroadcastEvent {
  constructor (postId) {
    super(constants.EVENT_REMOVE_POST, { id: postId })
  }
}

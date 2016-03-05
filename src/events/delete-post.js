import BroadcastEvent from './broadcast'
import constants from '../utils/constants'

export default class DeletePostEvent extends BroadcastEvent {
  constructor (postId) {
    super(constants.EVENT_DELETE_POST, { id: postId })
  }
}

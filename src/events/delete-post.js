import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import postSerializer from '../serializers/post'

export default class DeletePostEvent extends BroadcastEvent {
  constructor (post) {
    super(constants.EVENT_DELETE_POST, postSerializer(post))
  }
}

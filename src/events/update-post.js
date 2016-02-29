import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import postSerializer from '../serializers/post'

export default class UpdatePostEvent extends BroadcastEvent {
  constructor (post) {
    super(constants.EVENT_UPDATE_POST, postSerializer(post))
  }
}

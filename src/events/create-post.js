import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import postSerializer from '../serializers/post'

export default class CreatePostEvent extends BroadcastEvent {
  constructor (post) {
    super(constants.EVENT_CREATE_POST, postSerializer(post))
  }
}

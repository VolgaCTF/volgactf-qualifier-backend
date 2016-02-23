import BroadcastEvent from './broadcast'
import constants from '../utils/constants'

export default class RemoveCategoryEvent extends BroadcastEvent {
  constructor (categoryId) {
    super(constants.EVENT_REMOVE_CATEGORY, { id: categoryId })
  }
}

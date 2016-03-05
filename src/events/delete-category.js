import BroadcastEvent from './broadcast'
import constants from '../utils/constants'

export default class DeleteCategoryEvent extends BroadcastEvent {
  constructor (categoryId) {
    super(constants.EVENT_DELETE_CATEGORY, { id: categoryId })
  }
}

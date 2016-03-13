import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import categorySerializer from '../serializers/category'

export default class DeleteCategoryEvent extends BroadcastEvent {
  constructor (category) {
    super(constants.EVENT_DELETE_CATEGORY, categorySerializer(category))
  }
}

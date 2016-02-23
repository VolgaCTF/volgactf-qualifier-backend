import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import categorySerializer from '../serializers/category'

export default class CreateCategoryEvent extends BroadcastEvent {
  constructor (category) {
    super(constants.EVENT_CREATE_CATEGORY, categorySerializer(category))
  }
}

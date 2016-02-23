import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import categorySerializer from '../serializers/category'

export default class UpdateCategoryEvent extends BroadcastEvent {
  constructor (category) {
    super(constants.EVENT_UPDATE_CATEGORY, categorySerializer(category))
  }
}

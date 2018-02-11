const BroadcastEvent = require('./broadcast')
const { EVENT_UPDATE_CATEGORY } = require('../utils/constants')
const categorySerializer = require('../serializers/category')

class UpdateCategoryEvent extends BroadcastEvent {
  constructor (category) {
    super(EVENT_UPDATE_CATEGORY, categorySerializer(category))
  }
}

module.exports = UpdateCategoryEvent

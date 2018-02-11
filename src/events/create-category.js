const BroadcastEvent = require('./broadcast')
const { EVENT_CREATE_CATEGORY } = require('../utils/constants')
const categorySerializer = require('../serializers/category')

class CreateCategoryEvent extends BroadcastEvent {
  constructor (category) {
    super(EVENT_CREATE_CATEGORY, categorySerializer(category))
  }
}

module.exports = CreateCategoryEvent

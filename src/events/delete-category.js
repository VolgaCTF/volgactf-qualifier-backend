const BroadcastEvent = require('./broadcast')
const { EVENT_DELETE_CATEGORY } = require('../utils/constants')
const categorySerializer = require('../serializers/category')

class DeleteCategoryEvent extends BroadcastEvent {
  constructor (category) {
    super(EVENT_DELETE_CATEGORY, categorySerializer(category))
  }
}

module.exports = DeleteCategoryEvent

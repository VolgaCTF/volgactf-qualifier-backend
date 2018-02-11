const BroadcastEvent = require('./broadcast')
const { EVENT_UPDATE_POST } = require('../utils/constants')
const postSerializer = require('../serializers/post')

class UpdatePostEvent extends BroadcastEvent {
  constructor (post) {
    super(EVENT_UPDATE_POST, postSerializer(post))
  }
}

module.exports = UpdatePostEvent

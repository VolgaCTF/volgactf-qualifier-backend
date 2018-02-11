const BroadcastEvent = require('./broadcast')
const { EVENT_DELETE_POST } = require('../utils/constants')
const postSerializer = require('../serializers/post')

class DeletePostEvent extends BroadcastEvent {
  constructor (post) {
    super(EVENT_DELETE_POST, postSerializer(post))
  }
}

module.exports = DeletePostEvent

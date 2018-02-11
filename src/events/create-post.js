const BroadcastEvent = require('./broadcast')
const { EVENT_CREATE_POST } = require('../utils/constants')
const postSerializer = require('../serializers/post')

class CreatePostEvent extends BroadcastEvent {
  constructor (post) {
    super(EVENT_CREATE_POST, postSerializer(post))
  }
}

module.exports = CreatePostEvent

const BroadcastEvent = require('./broadcast')
const { EVENT_UPDATE_CONTEST } = require('../utils/constants')
const contestSerializer = require('../serializers/contest')

class UpdateContestEvent extends BroadcastEvent {
  constructor (contest) {
    super(EVENT_UPDATE_CONTEST, contestSerializer(contest))
  }
}

module.exports = UpdateContestEvent

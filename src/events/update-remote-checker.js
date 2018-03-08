const SupervisorEvent = require('./supervisor')
const { EVENT_UPDATE_REMOTE_CHECKER } = require('../utils/constants')
const remoteCheckerSerializer = require('../serializers/remote-checker')

class UpdateRemoteCheckerEvent extends SupervisorEvent {
  constructor (remoteChecker) {
    super(EVENT_UPDATE_REMOTE_CHECKER, remoteCheckerSerializer(remoteChecker))
  }
}

module.exports = UpdateRemoteCheckerEvent

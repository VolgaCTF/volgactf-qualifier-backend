const SupervisorEvent = require('./supervisor')
const { EVENT_DELETE_REMOTE_CHECKER } = require('../utils/constants')
const remoteCheckerSerializer = require('../serializers/remote-checker')

class DeleteRemoteCheckerEvent extends SupervisorEvent {
  constructor (remoteChecker) {
    super(EVENT_DELETE_REMOTE_CHECKER, remoteCheckerSerializer(remoteChecker))
  }
}

module.exports = DeleteRemoteCheckerEvent

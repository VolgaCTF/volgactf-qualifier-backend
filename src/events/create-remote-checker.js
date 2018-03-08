const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_REMOTE_CHECKER } = require('../utils/constants')
const remoteCheckerSerializer = require('../serializers/remote-checker')

class CreateRemoteCheckerEvent extends SupervisorEvent {
  constructor (remoteChecker) {
    super(EVENT_CREATE_REMOTE_CHECKER, remoteCheckerSerializer(remoteChecker))
  }
}

module.exports = CreateRemoteCheckerEvent

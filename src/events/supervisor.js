import BaseEvent from './base'

export default class SupervisorEvent extends BaseEvent {
  constructor (type, data) {
    super(type, data, null, null, {})
  }
}

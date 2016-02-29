import BaseEvent from './base'

export default class BroadcastEvent extends BaseEvent {
  constructor (type, data) {
    super(type, data, data, data, {})
  }
}

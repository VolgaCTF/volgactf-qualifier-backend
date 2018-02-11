const Model = require('../utils/model')

class Event extends Model {
  static get tableName () {
    return 'events'
  }
}

module.exports = Event

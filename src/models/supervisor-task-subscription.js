const Model = require('../utils/model')

class SupervisorTaskSubscription extends Model {
  static get tableName () {
    return 'supervisor_task_subscriptions'
  }
}

module.exports = SupervisorTaskSubscription

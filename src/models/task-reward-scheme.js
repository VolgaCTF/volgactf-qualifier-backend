const Model = require('../utils/model')

class TaskRewardScheme extends Model {
  static get tableName () {
    return 'task_reward_schemes'
  }
}

module.exports = TaskRewardScheme

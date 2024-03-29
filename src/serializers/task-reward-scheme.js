const _ = require('underscore')

module.exports = function (taskRewardScheme, options = {}) {
  const defaultOptions = {
    exposeDynlog: false
  }
  options = _.extend(defaultOptions, options)

  const r = {
    id: taskRewardScheme.id,
    taskId: taskRewardScheme.taskId,
    maxValue: taskRewardScheme.maxValue,
    minValue: taskRewardScheme.minValue,
    subtractPoints: taskRewardScheme.subtractPoints,
    subtractHitCount: taskRewardScheme.subtractHitCount,
    created: taskRewardScheme.created.getTime(),
    updated: taskRewardScheme.updated.getTime()
  }

  if (options.exposeDynlog) {
    r.dynlogK = taskRewardScheme.dynlogK
    r.dynlogV = taskRewardScheme.dynlogV
  }

  return r
}

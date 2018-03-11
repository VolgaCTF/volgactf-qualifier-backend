module.exports = function (taskRewardScheme) {
  return {
    id: taskRewardScheme.id,
    taskId: taskRewardScheme.taskId,
    maxValue: taskRewardScheme.maxValue,
    minValue: taskRewardScheme.minValue,
    subtractPoints: taskRewardScheme.subtractPoints,
    subtractHitCount: taskRewardScheme.subtractHitCount,
    created: taskRewardScheme.created.getTime(),
    updated: taskRewardScheme.updated.getTime()
  }
}

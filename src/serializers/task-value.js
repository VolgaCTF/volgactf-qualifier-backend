module.exports = function (taskValue, options = {}) {
  return {
    id: taskValue.id,
    taskId: taskValue.taskId,
    value: taskValue.value,
    created: taskValue.created.getTime(),
    updated: taskValue.updated.getTime()
  }
}

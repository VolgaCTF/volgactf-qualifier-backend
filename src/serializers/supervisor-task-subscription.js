module.exports = function (supervisorTaskSubscription) {
  return {
    id: supervisorTaskSubscription.id,
    supervisorId: supervisorTaskSubscription.supervisorId,
    taskId: supervisorTaskSubscription.taskId,
    createdAt: supervisorTaskSubscription.createdAt.getTime()
  }
}

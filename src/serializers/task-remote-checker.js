module.exports = function (taskRemoteChecker) {
  return {
    id: taskRemoteChecker.id,
    taskId: taskRemoteChecker.taskId,
    remoteCheckerId: taskRemoteChecker.remoteCheckerId,
    createdAt: taskRemoteChecker.createdAt.getTime()
  }
}

module.exports = function (taskFile) {
  return {
    id: taskFile.id,
    taskId: taskFile.taskId,
    prefix: taskFile.prefix,
    filename: taskFile.filename,
    createdAt: taskFile.createdAt.getTime()
  }
}

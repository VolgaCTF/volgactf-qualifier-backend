module.exports = function (taskCategory) {
  return {
    id: taskCategory.id,
    taskId: taskCategory.taskId,
    categoryId: taskCategory.categoryId,
    createdAt: taskCategory.createdAt.getTime()
  }
}

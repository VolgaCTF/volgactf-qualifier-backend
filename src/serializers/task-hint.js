export default function (taskHint) {
  return {
    id: taskHint.id,
    taskId: taskHint.taskId,
    hint: taskHint.hint,
    createdAt: taskHint.createdAt.getTime()
  }
}

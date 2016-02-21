export default function (taskAnswer) {
  return {
    id: taskAnswer.id,
    taskId: taskAnswer.taskId,
    answer: taskAnswer.answer,
    caseSensitive: taskAnswer.caseSensitive,
    createdAt: taskAnswer.createdAt.getTime()
  }
}

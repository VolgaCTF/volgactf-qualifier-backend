export default function (teamTaskHitAttempt) {
  return {
    teamId: teamTaskHitAttempt.teamId,
    taskId: teamTaskHitAttempt.taskId,
    wrongAnswer: teamTaskHitAttempt.wrongAnswer,
    createdAt: teamTaskHitAttempt.createdAt.getTime()
  }
}

export default function (teamTaskHit) {
  return {
    teamId: teamTaskHit.teamId,
    taskId: teamTaskHit.taskId,
    createdAt: teamTaskHit.createdAt.getTime()
  }
}


export default function (teamTaskProgress) {
  return {
    teamId: teamTaskProgress.teamId,
    taskId: teamTaskProgress.taskId,
    createdAt: teamTaskProgress.createdAt.getTime()
  }
}

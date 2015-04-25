
module.exports = (teamTaskProgress) ->
    result =
        teamId: teamTaskProgress.teamId
        taskId: teamTaskProgress.taskId
        createdAt: teamTaskProgress.createdAt.getTime()

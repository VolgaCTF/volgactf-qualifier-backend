
module.exports = (teamTaskProgress) ->
    result =
        teamId: teamTaskProgress.team
        taskId: teamTaskProgress.task
        createdAt: teamTaskProgress.createdAt.getTime()

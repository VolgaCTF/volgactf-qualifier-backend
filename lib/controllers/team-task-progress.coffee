TeamController = require '../controllers/team'
TeamTaskProgress = require '../models/team-task-progress'
logger = require '../utils/logger'
errors = require '../utils/errors'


class TeamTaskProgressController
    @create: (teamId, task, callback) ->
        TeamController.get teamId, (err, team) ->
            if err?
                callback err, null
            else
                TeamTaskProgress.find(teamId: team._id, taskId: task._id).count (err, count) ->
                    if err?
                        logger.error err
                        callback new errors.InternalError(), null
                    else
                        if count > 0
                            callback new errors.TaskAlreadySolvedError(), null
                        else
                            teamTaskProgress = new TeamTaskProgress
                                teamId: team._id
                                taskId: task._id
                                createdAt: new Date()
                            teamTaskProgress.save (err, teamTaskProgress) ->
                                if err?
                                    logger.error err
                                    callback new errors.InternalError(), null
                                else
                                    callback null, teamTaskProgress

    @list: (callback) ->
        TeamTaskProgress.find {}, (err, teamTaskProgress) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                callback null, teamTaskProgress

    @listForTeam: (teamId, callback) ->
        TeamTaskProgress.find teamId: teamId, (err, teamTaskProgress) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                callback null, teamTaskProgress

    @listForTask: (taskId, callback) ->
        TeamTaskProgress.find taskId: taskId, (err, teamTaskProgress) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                callback null, teamTaskProgress


module.exports = TeamTaskProgressController

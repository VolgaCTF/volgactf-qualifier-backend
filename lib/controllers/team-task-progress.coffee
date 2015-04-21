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
                TeamTaskProgress.find(team: team, task: task).count (err, count) ->
                    if err?
                        logger.error err
                        callback new errors.InternalError(), null
                    else
                        if count > 0
                            callback new errors.TaskAlreadySolvedError(), null
                        else
                            teamTaskProgress = new TeamTaskProgress
                                team: team
                                task: task
                                createdAt: new Date()
                            teamTaskProgress.save (err, teamTaskProgress) ->
                                if err?
                                    logger.error err
                                    callback new errors.InternalError(), null
                                else
                                    callback null, teamTaskProgress


module.exports = TeamTaskProgressController

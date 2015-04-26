_ = require 'underscore'

Contest = require '../models/contest'
TeamScore = require '../models/team-score'
TaskCategory = require '../models/task-category'
Task = require '../models/task'
TeamTaskProgress = require '../models/team-task-progress'

TeamController = require '../controllers/team'
TeamTaskProgressController = require '../controllers/team-task-progress'
TaskController = require '../controllers/task'

errors = require '../utils/errors'
constants = require '../utils/constants'
logger = require '../utils/logger'

publisher = require '../utils/publisher'
BaseEvent = require('../utils/events').BaseEvent

contestSerializer = require '../serializers/contest'
teamScoreSerializer = require '../serializers/team-score'

when_ = require 'when'


class UpdateContestEvent extends BaseEvent
    constructor: (contest) ->
        super 'updateContest'
        contestData = contestSerializer contest
        @data.supervisors = contestData
        @data.teams = contestData
        @data.guests = contest


class UpdateTeamScoreEvent extends BaseEvent
    constructor: (teamScore) ->
        super 'updateTeamScore'
        teamScoreData = teamScoreSerializer teamScore
        @data.supervisors = teamScoreData
        @data.teams = teamScoreData
        @data.guests = teamScoreData


class ContestController
    @get: (callback) ->
        Contest.findOne {}, (err, contest) ->
            if err?
                logger.error err
                callback new errors.ContestNotInitializedError(), null
            else
                # Warning: this can be null. This is a normal situation.
                callback null, contest

    @getScores: (callback) ->
        TeamController.listQualified (err, teams) ->
            if err?
                callback err, null
            else
                TeamScore.find {}, (err, teamScores) ->
                    if err?
                        callback err, null
                    else
                        result = _.map teams, (team) ->
                            teamScore = _.findWhere teamScores, teamId: team._id
                            unless teamScore?
                                teamScore =
                                    teamId: team._id
                                    score: 0
                                    updatedAt: null

                            return teamScore

                        callback null, result

    @update: (state, startsAt, finishesAt, callback) ->
        ContestController.get (err, contest) ->
            if err?
                callback err, null
            else
                alwaysResolves = ->
                    deferred = when_.defer()
                    deferred.resolve()
                    deferred.promise

                promises = []
                if state is constants.CONTEST_INITIAL
                    if contest? and contest.state != state
                        removeTaskCategories = ->
                            deferred = when_.defer()
                            TaskCategory.remove {}, (err) ->
                                if err?
                                    logger.error err
                                    deferred.reject new errors.InternalError()
                                else
                                    deferred.resolve()
                            deferred.promise

                        promises.push removeTaskCategories()

                        removeTasks = ->
                            deferred = when_.defer()
                            Task.remove {}, (err) ->
                                if err?
                                    logger.error err
                                    deferred.reject err
                                else
                                    deferred.resolve()
                            deferred.promise

                        promises.push removeTasks()

                        removeTeamScores = ->
                            deferred = when_.defer()
                            TeamScore.remove {}, (err) ->
                                if err?
                                    logger.error err
                                    deferred.reject err
                                else
                                    deferred.resolve()
                            deferred.promise

                        promises.push removeTeamScores()

                        removeTeamTaskProgressEntries = ->
                            deferred = when_.defer()
                            TeamTaskProgress.remove {}, (err) ->
                                if err?
                                    logger.error err
                                    deferred.reject err
                                else
                                    deferred.resolve()
                            deferred.promise

                        promises.push removeTeamTaskProgressEntries()
                    else
                        promises.push alwaysResolves()
                else
                    promises.push alwaysResolves()

                when_
                    .all promises
                    .then ->
                        if contest?
                            contest.state = state
                            contest.startsAt = startsAt
                            contest.finishesAt = finishesAt
                        else
                            contest = new Contest
                                state: state
                                startsAt: startsAt
                                finishesAt: finishesAt

                        contest.save (err, contest) ->
                            if err?
                                logger.error err
                                callback new errors.InternalError(), null
                            else
                                callback null, contest

                                publisher.publish 'realtime', new UpdateContestEvent contest
                    .catch (err) ->
                        callback new error.InternalError(), null

    @updateScores: (callback) ->
        TeamController.listQualified (err, teams) ->
            if err?
                callback err
            else
                TeamScore.find {}, (err, teamScores) ->
                    if err?
                        callback err
                    else
                        TaskController.list (err, tasks) ->
                            if err?
                                callback err
                            else
                                TeamTaskProgressController.list (err, teamTaskProgress) ->
                                    if err?
                                        callback err
                                    else
                                        for team in teams
                                            teamScore = _.findWhere teamScores, teamId: team._id
                                            taskProgressEntries = _.where teamTaskProgress, teamId: team._id
                                            totalScore = 0
                                            lastUpdatedAt = null

                                            for taskProgress in taskProgressEntries
                                                task = _.findWhere tasks, _id: taskProgress.taskId
                                                if task?
                                                    totalScore += task.value
                                                    if lastUpdatedAt?
                                                        if lastUpdatedAt.getTime() < taskProgress.createdAt.getTime()
                                                            lastUpdatedAt = taskProgress.createdAt
                                                    else
                                                        lastUpdatedAt = taskProgress.createdAt

                                            needCreate = not teamScore? and totalScore > 0
                                            needUpdate = teamScore? and totalScore > teamScore.score

                                            if needUpdate
                                                teamScore.score = totalScore
                                                teamScore.updatedAt = lastUpdatedAt
                                            else if needCreate
                                                teamScore = new TeamScore
                                                    teamId: team._id
                                                    score: totalScore
                                                    updatedAt: lastUpdatedAt

                                            if needUpdate or needCreate
                                                teamScore.save (err, teamScore) ->
                                                    if err?
                                                        logger.error err
                                                    else
                                                        publisher.publish 'realtime', new UpdateTeamScoreEvent teamScore

                                        callback null


module.exports = ContestController

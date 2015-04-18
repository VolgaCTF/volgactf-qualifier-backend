Contest = require '../models/contest'
errors = require '../utils/errors'
constants = require '../utils/constants'
logger = require '../utils/logger'

publisher = require '../utils/publisher'
BaseEvent = require('../utils/events').BaseEvent


serializeContest = (contest) ->
    result =
        state: contest.state
        startsAt: contest.startsAt.getTime()
        finishesAt: contest.finishesAt.getTime()


class UpdateContestEvent extends BaseEvent
    constructor: (contest) ->
        super 'updateContest'
        contestData = serializeContest contest
        @data.supervisors = contestData
        @data.teams = contestData
        @data.guests = contest


class ContestController
    @get: (callback) ->
        Contest.findOne {}, (err, contest) ->
            if err?
                logger.error err
                callback new errors.ContestNotInitializedError(), null
            else
                # Warning: this can be null. This is a normal situation.
                callback null, contest

    @update: (state, startsAt, finishesAt, callback) ->
        ContestController.get (err, contest) ->
            if err?
                callback err, null
            else
                # if state is constants.CONTEST_INITIAL

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


module.exports = ContestController

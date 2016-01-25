constants = require '../utils/constants'

module.exports = (contest) ->
    if contest?
        result =
            state: contest.state
            startsAt: contest.startsAt.getTime()
            finishesAt: contest.finishesAt.getTime()
    else
        result =
            state: constants.CONTEST_INITIAL
            startsAt: null
            finishesAt: null

    result

express = require 'express'
router = express.Router()

ContestController = require '../controllers/contest'
constants = require '../utils/constants'


router.get '/', (request, response, next) ->
    ContestController.get (err, contest) ->
        if err?
            next err
        else
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

            response.json result


module.exports = router

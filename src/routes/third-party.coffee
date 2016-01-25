express = require 'express'
router = express.Router()

logger = require '../utils/logger'
errors = require '../utils/errors'
TeamController = require '../controllers/team'
TeamScore = require '../models/team-score'
_ = require 'underscore'


rankFunc = (a, b) ->
    if a.score > b.score
        return -1
    else if a.score < b.score
        return 1
    else
        if a.updatedAt? and b.updatedAt?
            if a.updatedAt.getTime() < b.updatedAt.getTime()
                return -1
            else if a.updatedAt.getTime() > b.updatedAt.getTime()
                return 1
            else
                return 0
        else if a.updatedAt? and not b.updatedAt?
            return -1
        else if not a.updatedAt? and b.updatedAt?
            return 1
        else
            return 0

router.get '/ctftime', (request, response, next) ->
    TeamController.listQualified (err, teams) ->
        if err?
            logger.error err
            next new errors.InternalError(), null
        else
            TeamScore.find {}, (err, teamScores) ->
                if err?
                    logger.error err
                    next new errors.InternalError(), null
                else
                    entries = _.map teams, (team) ->
                        teamScore = _.findWhere teamScores, teamId: team._id
                        if teamScore?
                            entry =
                                team: team.name
                                score: teamScore.score
                                updatedAt: teamScore.updatedAt
                        else
                            entry =
                                team: team.name
                                score: 0
                                updatedAt: null

                        return entry

                    entries.sort rankFunc
                    response.json standings: _.map entries, (entry, ndx) ->
                        return pos: ndx + 1, team: entry.team, score: entry.score


module.exports = router

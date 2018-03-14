const express = require('express')
const router = express.Router()

const logger = require('../utils/logger')
const { InternalError } = require('../utils/errors')
const TeamController = require('../controllers/team')
const TeamRanking = require('../models/team-ranking')
const _ = require('underscore')
const jsesc = require('jsesc')

function rank (a, b) {
  if (a.position < b.position) {
    return -1
  } else if (a.position > b.position) {
    return 1
  } else {
    return 0
  }
}

router.get('/ctftime', function (request, response, next) {
  TeamController.index(function (err, teams) {
    if (err) {
      logger.error(err)
      next(new InternalError(), null)
    } else {
      TeamRanking
        .query()
        .then(function (teamRankings) {
          const entries = _.map(teamRankings, function (teamRanking) {
            const team = _.findWhere(teams, { id: teamRanking.teamId })
            return {
              team: team.name,
              position: teamRanking.position,
              score: teamRanking.score
            }
          })
          entries.sort(rank)
          const data = {
            standings: _.map(entries, function (entry, ndx) {
              return {
                pos: ndx + 1,
                team: entry.team,
                score: entry.score
              }
            })
          }
          response
            .type('json')
            .send(jsesc(data, {
              json: true
            }))
        })
        .catch(function (err) {
          logger.error(err)
          next(new InternalError(), null)
        })
    }
  }, true)
})

module.exports = router

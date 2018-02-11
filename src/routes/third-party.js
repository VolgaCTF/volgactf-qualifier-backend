const express = require('express')
const router = express.Router()

const logger = require('../utils/logger')
const { InternalError } = require('../utils/errors')
const TeamController = require('../controllers/team')
const TeamScore = require('../models/team-score')
const _ = require('underscore')
const jsesc = require('jsesc')

function rankFunc (a, b) {
  if (a.score > b.score) {
    return -1
  } else if (a.score < b.score) {
    return 1
  } else {
    if (a.updatedAt && b.updatedAt) {
      if (a.updatedAt.getTime() < b.updatedAt.getTime()) {
        return -1
      } else if (a.updatedAt.getTime() > b.updatedAt.getTime()) {
        return 1
      } else {
        return 0
      }
    } else if (a.updatedAt && !b.updatedAt) {
      return -1
    } else if (!a.updatedAt && b.updatedAt) {
      return 1
    } else {
      return 0
    }
  }
}

router.get('/ctftime', function (request, response, next) {
  TeamController.index(function (err, teams) {
    if (err) {
      logger.error(err)
      next(new InternalError(), null)
    } else {
      TeamScore
        .query()
        .then(function (teamScores) {
          const entries = _.map(teams, function (team) {
            const teamScore = _.findWhere(teamScores, { teamId: team.id })
            let entry = null
            if (teamScore) {
              entry = {
                team: team.name,
                score: teamScore.score,
                updatedAt: teamScore.updatedAt
              }
            } else {
              entry = {
                team: team.name,
                score: 0,
                updatedAt: null
              }
            }

            return entry
          })

          entries.sort(rankFunc)
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

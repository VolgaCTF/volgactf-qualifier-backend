const express = require('express')
const router = express.Router()

const logger = require('../utils/logger')
const { InternalError } = require('../utils/errors')
const TeamController = require('../controllers/team')
const CountryController = require('../controllers/country')
const TeamRanking = require('../models/team-ranking')

const _ = require('underscore')
const jsesc = require('jsesc')
const csv = require('csv-express')

const { needsToBeAuthorizedSupervisor } = require('../middleware/session')

function rank (a, b) {
  if (a.position < b.position) {
    return -1
  } else if (a.position > b.position) {
    return 1
  } else {
    return 0
  }
}

router.get('/ctftime.json', function (request, response, next) {
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

router.get('/teams.csv', needsToBeAuthorizedSupervisor, function (request, response, next) {
  CountryController.index(function (err, countries) {
    if (err) {
      next(new InternalError(), null)
    } else {
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
                  team: team,
                  position: teamRanking.position,
                  score: teamRanking.score
                }
              })
              entries.sort(rank)
              response.csv(_.map(entries, function (entry, ndx) {
                const country = _.findWhere(countries, { id: entry.team.countryId })
                return {
                  position: ndx + 1,
                  team: entry.team.name,
                  email: entry.team.email,
                  country: country.name,
                  locality: entry.team.locality,
                  institution: entry.team.institution,
                  score: entry.score
                }
              }), true, {
                'Content-Type': 'text/csv'
              })
            })
            .catch(function (err) {
              logger.error(err)
              next(new InternalError(), null)
            })
        }
      }, true)
    }
  })
})

module.exports = router

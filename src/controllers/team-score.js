const TeamController = require('./team')
const TeamScore = require('../models/team-score')
const _ = require('underscore')
const logger = require('../utils/logger')
const TeamTaskHitController = require('../controllers/team-task-hit')
const TaskController = require('../controllers/task')
const UpdateTeamScoreEvent = require('../events/update-team-score')
const async = require('async')
const EventController = require('./event')
const { InternalError } = require('../utils/errors')

class TeamScoreController {
  static index (callback) {
    TeamController.index(function (err, teams) {
      if (err) {
        callback(err, null)
      } else {
        TeamScore
          .query()
          .then(function (teamScores) {
            callback(null, _.map(teams, function (team) {
              let teamScore = _.findWhere(teamScores, { teamId: team.id })
              if (!teamScore) {
                teamScore = {
                  teamId: team.id,
                  score: 0,
                  updatedAt: null
                }
              }

              return teamScore
            }))
          })
          .catch(function (err) {
            logger.error(err)
            callback(err, null)
          })
      }
    }, true)
  }

  static updateTeamScore (teamId, callback) {
    TeamController.get(teamId, function (err, team) {
      if (err) {
        callback(err)
      } else {
        TaskController.index(function (err, tasks) {
          if (err) {
            callback(err)
          } else {
            TeamTaskHitController.listForTeam(teamId, function (err, teamTaskHits) {
              if (err) {
                callback(err)
              } else {
                let totalScore = 0
                let lastUpdatedAt = null

                for (const taskHit of teamTaskHits) {
                  const task = _.findWhere(tasks, { id: taskHit.taskId })
                  if (task) {
                    totalScore += task.value
                    if (lastUpdatedAt) {
                      if (lastUpdatedAt.getTime() < taskHit.createdAt.getTime()) {
                        lastUpdatedAt = taskHit.createdAt
                      }
                    } else {
                      lastUpdatedAt = taskHit.createdAt
                    }
                  }
                }

                if (totalScore > 0 && lastUpdatedAt) {
                  TeamScore
                    .raw(
                      `INSERT INTO team_scores AS t ("teamId", "score", "updatedAt")
                      VALUES (?, ?, ?)
                      ON CONFLICT ("teamId") DO
                      UPDATE SET "score" = EXCLUDED."score", "updatedAt" = EXCLUDED."updatedAt"
                      WHERE t."score" != EXCLUDED."score"
                      RETURNING *`,
                      [team.id, totalScore, lastUpdatedAt]
                    )
                    .then(function (response) {
                      callback(null)
                      if (response.rowCount === 1) {
                        EventController.push(new UpdateTeamScoreEvent(response.rows[0]))
                      }
                    })
                    .catch(function (err) {
                      logger.error(err)
                      callback(err)
                    })
                } else {
                  callback(null)
                }
              }
            })
          }
        })
      }
    }, true)
  }

  static updateScores (callback) {
    TeamController.index(function (err, teams) {
      if (err) {
        callback(err)
      } else {
        TaskController.index(function (err, tasks) {
          if (err) {
            callback(err)
          } else {
            TeamTaskHitController.list(function (err, teamTaskHits) {
              if (err) {
                callback(err)
              } else {
                const recalculateTeamScore = function (team, next) {
                  const taskHitEntries = _.where(teamTaskHits, { teamId: team.id })
                  let totalScore = 0
                  let lastUpdatedAt = null

                  for (const taskHit of taskHitEntries) {
                    const task = _.findWhere(tasks, { id: taskHit.taskId })
                    if (task) {
                      totalScore += task.value
                      if (lastUpdatedAt) {
                        if (lastUpdatedAt.getTime() < taskHit.createdAt.getTime()) {
                          lastUpdatedAt = taskHit.createdAt
                        }
                      } else {
                        lastUpdatedAt = taskHit.createdAt
                      }
                    }
                  }

                  if (totalScore > 0 && lastUpdatedAt) {
                    TeamScore
                      .raw(
                        `INSERT INTO team_scores AS t ("teamId", "score", "updatedAt")
                        VALUES (?, ?, ?)
                        ON CONFLICT ("teamId") DO
                        UPDATE SET "score" = EXCLUDED."score", "updatedAt" = EXCLUDED."updatedAt"
                        WHERE t."score" != EXCLUDED."score"
                        RETURNING *`,
                        [team.id, totalScore, lastUpdatedAt]
                      )
                      .then(function (response) {
                        next(null, null)
                        if (response.rowCount === 1) {
                          EventController.push(new UpdateTeamScoreEvent(response.rows[0]))
                        }
                      })
                      .catch(function (err) {
                        logger.error(err)
                        next(err, null)
                      })
                  } else {
                    next(null, null)
                  }
                }

                async.mapLimit(teams, 5, recalculateTeamScore, function (err, results) {
                  if (err) {
                    logger.error(err)
                    callback(new InternalError())
                  } else {
                    callback(null)
                  }
                })
              }
            })
          }
        })
      }
    }, true)
  }
}

module.exports = TeamScoreController

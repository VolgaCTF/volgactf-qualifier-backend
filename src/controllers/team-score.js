import TeamController from './team'
import TeamScore from '../models/team-score'
import _ from 'underscore'
import logger from '../utils/logger'
import TeamTaskHitController from '../controllers/team-task-hit'
import TaskController from '../controllers/task'
import UpdateTeamScoreEvent from '../events/update-team-score'
import async from 'async'
import EventController from './event'
import { InternalError } from '../utils/errors'

class TeamScoreController {
  static index (callback) {
    TeamController.index((err, teams) => {
      if (err) {
        callback(err, null)
      } else {
        TeamScore
          .query()
          .then((teamScores) => {
            callback(null, _.map(teams, (team) => {
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
          .catch((err) => {
            logger.error(err)
            callback(err, null)
          })
      }
    }, true)
  }

  static updateScores (callback) {
    TeamController.index((err, teams) => {
      if (err) {
        callback(err)
      } else {
        TeamScore
          .query()
          .then((teamScores) => {
            TaskController.index((err, tasks) => {
              if (err) {
                callback(err)
              } else {
                TeamTaskHitController.list((err, teamTaskHits) => {
                  if (err) {
                    callback(err)
                  } else {
                    let recalculateTeamScore = function (team, next) {
                      let taskHitEntries = _.where(teamTaskHits, { teamId: team.id })
                      let totalScore = 0
                      let lastUpdatedAt = null

                      for (let taskHit of taskHitEntries) {
                        let task = _.findWhere(tasks, { id: taskHit.taskId })
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
                          .then((response) => {
                            next(null, null)
                            if (response.rowCount === 1) {
                              EventController.push(new UpdateTeamScoreEvent(response.rows[0]))
                            }
                          })
                          .catch((err) => {
                            logger.error(err)
                            next(err, null)
                          })
                      } else {
                        next(null, null)
                      }
                    }

                    async.mapLimit(teams, 5, recalculateTeamScore, (err, results) => {
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
          })
          .catch((err) => {
            logger.error(err)
            callback(err)
          })
      }
    }, true)
  }
}

export default TeamScoreController

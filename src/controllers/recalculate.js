const _ = require('underscore')
const async = require('async')
const { transaction } = require('objection')

const logger = require('../utils/logger')

const EventController = require('./event')

const Task = require('../models/task')
const TaskValue = require('../models/task-value')
const TaskRewardScheme = require('../models/task-reward-scheme')
const TeamTaskHit = require('../models/team-task-hit')
const Team = require('../models/team')
const TeamRanking = require('../models/team-ranking')

const UpdateTaskValueEvent = require('../events/update-task-value')
const UpdateTeamRankingsEvent = require('../events/update-team-rankings')

class RecalculateController {
  updateTaskValue (entry, next) {
    if (entry.taskValue && entry.taskRewardScheme) {
      let rewardScheme = 'fixed'
      if (!_.isNull(entry.taskRewardScheme.minValue)) {
        rewardScheme = 'variable'
      }

      if (rewardScheme === 'fixed') {
        if (entry.taskRewardScheme.maxValue !== entry.taskValue.value) {
          TaskValue
          .query()
          .patchAndFetchById(entry.taskValue.id, {
            value: entry.taskRewardScheme.maxValue,
            updated: new Date()
          })
          .then(function (newTaskValue) {
            next(null, {
              task: entry.task,
              taskValue: newTaskValue
            })
          })
          .catch(function (err) {
            next(err, null)
          })
        } else {
          next(null, null)
        }
      } else if (rewardScheme === 'variable') {
        const hitCount = entry.taskHits.length
        const subtractTotal = Math.trunc(hitCount / entry.taskRewardScheme.subtractHitCount) * entry.taskRewardScheme.subtractPoints
        let newValue = entry.taskRewardScheme.maxValue - subtractTotal
        if (newValue < entry.taskRewardScheme.minValue) {
          newValue = entry.taskRewardScheme.minValue
        }

        if (newValue !== entry.taskValue.value) {
          TaskValue
          .query()
          .patchAndFetchById(entry.taskValue.id, {
            value: newValue,
            updated: new Date()
          })
          .then(function (newTaskValue) {
            next(null, {
              task: entry.task,
              taskValue: newTaskValue
            })
          })
          .catch(function (err) {
            next(err, null)
          })
        } else {
          next(null, null)
        }
      } else {
        next(null, null)
      }
    } else {
      next(null, null)
    }
  }

  updateTaskValues () {
    let tasks = null
    let taskIds = []
    let taskValues = null
    let taskRewardSchemes = null
    let teamTaskHits = null

    return new Promise((resolve, reject) => {
      Task
      .query()
      .then((resTasks) => {
        tasks = resTasks
        taskIds = _.map(tasks, function (task) {
          return task.id
        })
        return TaskValue
        .query()
        .whereIn('taskId', taskIds)
      })
      .then((resTaskValues) => {
        taskValues = resTaskValues
        return TaskRewardScheme
        .query()
        .whereIn('taskId', taskIds)
      })
      .then((resTaskRewardSchemes) => {
        taskRewardSchemes = resTaskRewardSchemes
        return TeamTaskHit
        .query()
        .whereIn('taskId', taskIds)
      })
      .then((resTeamTaskHits) => {
        teamTaskHits = resTeamTaskHits
      })
      .then(() => {
        const entries = _.map(tasks, (task) => {
          return {
            task: task,
            taskRewardScheme: _.findWhere(taskRewardSchemes, { taskId: task.id }),
            taskValue: _.findWhere(taskValues, { taskId: task.id }),
            taskHits: _.where(teamTaskHits, { taskId: task.id })
          }
        })

        async.mapLimit(entries, 5, this.updateTaskValue, (err2, results) => {
          if (err2) {
            reject(err2)
          } else {
            resolve(_.filter(results, function (item) {
              return !_.isNull(item)
            }))
          }
        })
      })
      .catch(function (err) {
        reject(err)
      })
    })
  }

  saveTeamRankings (entries, TeamRanking) {
    return new Promise((resolve, reject) => {
      async.mapLimit(
        entries,
        5,
        (entry, next) => {
          TeamRanking
          .raw(
            `INSERT INTO team_rankings AS t ("teamId", "position", "score", "lastUpdated")
            VALUES (?, ?, ?, ?)
            ON CONFLICT ("teamId") DO
            UPDATE SET "position" = EXCLUDED."position", "score" = EXCLUDED."score", "lastUpdated" = EXCLUDED."lastUpdated"
            WHERE t."position" != EXCLUDED."position" OR t."score" != EXCLUDED."score"
            RETURNING *`,
            [entry.teamId, entry.position, entry.score, entry.lastUpdated]
          )
          .then(function (response) {
            next(null, response)
          })
          .catch(function (err) {
            next(err, null)
          })
        },
        (err, results) => {
          if (err) {
            reject(err)
          } else {
            resolve(results)
          }
        }
      )
    })
  }

  compareTeamScores (a, b) {
    if (a.score > b.score) {
        return -1
    } else if (a.score < b.score) {
        return 1
    } else {
      if (a.lastUpdated && b.lastUpdated) {
        if (a.lastUpdated < b.lastUpdated) {
          return -1
        } else if (a.lastUpdated > b.lastUpdated) {
          return 1
        } else {
          if (a.teamCreated < b.teamCreated) {
            return -1
          } else if (a.teamCreated > b.teamCreated) {
            return 1
          } else {
            return 0
          }
        }
      } else if (a.lastUpdated && !b.lastUpdated) {
        return -1
      } else if (!a.lastUpdated && b.lastUpdated) {
        return 1
      } else {
        if (a.teamCreated < b.teamCreated) {
          return -1
        } else if (a.teamCreated > b.teamCreated) {
          return 1
        } else {
          return 0
        }
      }
    }
  }

  sortTeamScores (entries) {
    return new Promise((resolve, reject) => {
      entries.sort(this.compareTeamScores)
      resolve(_.map(entries, function (entry, ndx) {
        return {
          teamId: entry.team.id,
          position: ndx + 1,
          score: entry.score,
          lastUpdated: entry.lastUpdated
        }
      }))
    })
  }

  calculateTeamScore (entry) {
    let score = 0
    let lastUpdated = null

    for (const taskHit of entry.teamHits) {
      const taskValue = _.findWhere(entry.taskValues, { taskId: taskHit.taskId })
      if (taskValue) {
        score += taskValue.value
        if (lastUpdated) {
          if (lastUpdated.getTime() < taskHit.createdAt.getTime()) {
            lastUpdated = taskHit.createdAt
          }
        } else {
          lastUpdated = taskHit.createdAt
        }
      }
    }

    return {
      team: entry.team,
      teamCreated: entry.team.createdAt.getTime(),
      score: score,
      lastUpdated: lastUpdated
    }
  }

  calculateTeamScores (entries) {
    return new Promise((resolve, reject) => {
      resolve(_.map(entries, (entry) => {
        return this.calculateTeamScore(entry)
      }))
    })
  }

  updateTeamRankings () {
    let teams = null
    let taskValues = null
    let teamTaskHits = null

    return new Promise((resolve, reject) => {
      Team
      .query()
      .where('emailConfirmed', true)
      .andWhere('disqualified', false)
      .then((resTeams) => {
        teams = resTeams
        return TaskValue.query()
      })
      .then((resTaskValues) => {
        taskValues = resTaskValues
        return TeamTaskHit.query()
      })
      .then((resTeamTaskHits) => {
        teamTaskHits = resTeamTaskHits
        const entries = _.map(teams, function (team) {
          const teamHits = _.where(teamTaskHits, { teamId: team.id })
          const taskIds = _.uniq(_.map(teamHits, function (teamHit) {
            return teamHit.taskId
          }))
          return {
            team: team,
            teamHits: teamHits,
            taskValues: _.filter(taskValues, function (taskValue) {
              return _.contains(taskIds, taskValue.taskId)
            })
          }
        })
        logger.info('STEP 1')
        logger.info(entries)
        return this.calculateTeamScores(entries)
      })
      .then((entries) => {
        logger.info('STEP 2')
        logger.info(entries)
        return this.sortTeamScores(entries)
      })
      .then((entries) => {
        logger.info('STEP 3')
        logger.info(entries)
        return transaction(TeamRanking, (TeamRanking) => {
          return this.saveTeamRankings(entries, TeamRanking)
        })
      })
      .then((entries) => {
        resolve(entries)
      })
      .catch(function (err) {
        reject(err)
      })
    })
  }

  recalculate () {
    return new Promise((resolve, reject) => {
      this.updateTaskValues()
      .then((taskValueEntries) => {
        _.each(taskValueEntries, function (entry) {
          EventController.push(new UpdateTaskValueEvent(entry.task, entry.taskValue))
        })

        return this.updateTeamRankings()
      })
      .then((entries) => {
        logger.info(entries)
        return TeamRanking.query()
      })
      .then((teamRankings) => {
        EventController.push(new UpdateTeamRankingsEvent(teamRankings))
        resolve()
      })
      .catch(function (err) {
        reject(err)
      })
    })
  }
}

module.exports = new RecalculateController()

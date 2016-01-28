import parser from 'nomnom'
import logger from './utils/logger'

import SupervisorController from './controllers/supervisor'
import TeamController from './controllers/team'
import TeamTaskProgressController from './controllers/team-task-progress'
import TeamTaskProgress from './models/team-task-progress'
import _ from 'underscore'
import async from 'async'


parser.command('create_supervisor')
  .help('Create supervisor user')
  .option('username', {
    required: true,
    abbr: 'u',
    help: 'User name'
  })
  .option('password', {
    required: true,
    abbr: 'p',
    help: 'Password'
  })
  .option('rights', {
    required: true,
    abbr: 'r',
    choices: [
      'admin',
      'manager'
    ],
    help: 'Supervisor rights - admin or manager'
  })
  .callback((opts) => {
    let supervisorOpts = {
      username: opts.username,
      password: opts.password,
      rights: opts.rights
    }
    SupervisorController.create(supervisorOpts, (err, supervisor) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        logger.info(`Supervisor ${supervisor.username} has been created!`)
        process.exit(0)
      }
    })
  })

parser.command('remove_supervisor')
  .help('Remove supervisor user')
  .option('username', {
    required: true,
    abbr: 'u',
    help: 'User name'
  })
  .callback((opts) => {
    SupervisorController.remove(opts.username, (err) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        logger.info(`Supervisor ${opts.username} has been removed!`)
        process.exit(0)
      }
    })
  })

parser.command('list_supervisors')
  .help('List all supervisors')
  .callback((opts) => {
    SupervisorController.list((err, supervisors) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        for (supervisor in supervisors) {
          logger.info(`Supervisor #${supervisor.id} ${supervisor.username} (${supervisor.rights})`)
        }
        process.exit(0)
      }
    })
  })

parser.command('list_teams')
  .help('List all teams')
  .callback((opts) => {
    TeamController.list((err, teams) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        for (team in teams) {
          logger.info(`Team ${team.name} <${team.email}>`)
        }
        process.exit(0)
      }
    })
  })

parser.command('update_teams')
  .help('Update team fields')
  .callback((opts) => {
    TeamController.list((err, teams) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        let saveTeam = (team, next) => {
          team.disqualified = false
          team.resetPasswordToken = null
          team.save((err, team) => {
            if (err) {
              next(err, null)
            } else {
              next(null, team)
            }
          })
        }

        async.mapLimit(teams, 5, saveTeam, (err, results) => {
          if (err) {
            logger.error(err)
            process.exit(1)
          } else {
            logger.info('Completed')
            process.exit(0)
          }
        })
      }
    })
  })


parser.command('cleanup_scores')
  .help('Cleanup scores')
  .callback((opts) => {
    TeamController.list((err, teams) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        TeamTaskProgressController.list((err, teamTaskProgress) => {
          if (err) {
            logger.error(err)
            process.exit(1)
          } else {
            let findDuplicateTeamScore = function(team, next) {
              let taskProgressEntries = _.where(teamTaskProgress, { teamId: team._id })
              let countedTaskIds = []
              let idsToDelete = []

              for (taskProgress in taskProgressEntries) {
                if (!_.contains(countedTaskIds, taskProgress.taskId)) {
                  countedTaskIds.push(taskProgress.taskId)
                } else {
                  idsToDelete.push(taskProgress._id)
                }
              }

              next(null, idsToDelete)
            }

            async.mapLimit(teams, 5, findDuplicateTeamScore, (err, results) => {
              if (err) {
                logger.error(err)
                process.exit(1)
              } else {
                let duplicateEntryIds = _.union.apply(null, results)
                let toRemoveCount = duplicateEntryIds.length

                let removeDuplicateEntry = function(entryId, next) {
                  TeamTaskProgress.remove({ _id: entryId }, (err) => {
                    if (err) {
                      logger.error(err)
                      next(err, null)
                    } else {
                      next(null, null)
                    }
                  })
                }

                async.mapLimit(duplicateEntryIds, 5, removeDuplicateEntry, (err, results) => {
                  if (err) {
                    logger.error(err)
                    process.exit(1)
                  } else {
                    logger.info(`Removed ${toRemoveCount} entries`)
                    process.exit(0)
                  }
                })
              }
            })
          }
        })
      }
    })
  })


export function run() {
  parser.parse()
}

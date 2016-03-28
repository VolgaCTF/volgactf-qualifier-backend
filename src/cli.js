import logger from './utils/logger'
import parser from 'commander'
import prompt from 'prompt'
import SupervisorController from './controllers/supervisor'
import TeamController from './controllers/team'
import StatController from './controllers/stat'
import Table from 'cli-table'
import _ from 'underscore'

parser
  .command('create_supervisor')
  .description('Create supervisor')
  .option('-u, --username <username>', 'username')
  .option('-r, --rights <rights>', 'rights (admin, manager)')
  .action((options) => {
    prompt.start()
    prompt.message = ''
    prompt.get([{
      name: 'password',
      required: true,
      hidden: true
    }, {
      name: 'confirmation',
      required: true,
      hidden: true,
      conform: (confirmation) => {
        if (prompt.history('password').value !== confirmation) {
          logger.error('Verification has failed')
          process.exit(1)
        } else {
          return true
        }
      }
    }], (err, result) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        let supervisorOpts = {
          username: options.username,
          password: result.password,
          rights: options.rights
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
      }
    })
  })

parser
  .command('change_supervisor_password')
  .description("Change supervisor's password")
  .option('-u, --username <user>', 'username')
  .action((options) => {
    prompt.start()
    prompt.message = ''
    prompt.get([{
      name: 'new_password',
      required: true,
      hidden: true
    }, {
      name: 'confirmation',
      required: true,
      hidden: true,
      conform: (confirmation) => {
        if (prompt.history('new_password').value !== confirmation) {
          logger.err('Verification has failed')
          process.exit(1)
        } else {
          return true
        }
      }
    }], (err, result) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        let supervisorOpts = {
          username: options.username,
          password: result.new_password
        }
        SupervisorController.edit(supervisorOpts, (err, supervisor) => {
          if (err) {
            logger.error(err)
            process.exit(1)
          } else {
            logger.info(`Password for supervisor ${options.username} has been updated!`)
            process.exit(0)
          }
        })
      }
    })
  })

parser
  .command('delete_supervisor')
  .description('Delete supervisor user')
  .option('-u, --username <username', 'username')
  .action((options) => {
    SupervisorController.delete(options.username, (err) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        logger.info(`Supervisor ${options.username} has been deleted!`)
        process.exit(0)
      }
    })
  })

parser
  .command('index_supervisors')
  .description('Index supervisors')
  .action((opts) => {
    SupervisorController.index((err, supervisors) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        for (let supervisor of supervisors) {
          logger.info(`Supervisor #${supervisor.id} ${supervisor.username} (${supervisor.rights})`)
        }
        process.exit(0)
      }
    })
  })

parser
  .command('disqualify_team')
  .description('Disqualify team')
  .option('-t, --team-id <team>', 'teamId')
  .action((options) => {
    prompt.start()
    prompt.message = ''
    prompt.get([{
      name: 'confirmation',
      required: true,
      hidden: false,
      conform: (confirmation) => {
        if (confirmation !== 'yes') {
          logger.err('You should have typed yes')
          process.exit(1)
        } else {
          return true
        }
      }
    }], (err, result) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        let teamId = parseInt(options.teamId, 10)
        TeamController.disqualify(teamId, (err) => {
          if (err) {
            logger.error(err)
            process.exit(1)
          } else {
            logger.info(`Team ${teamId} has been disqualified!`)
            process.exit(0)
          }
        })
      }
    })
  })

parser
  .command('display_stats')
  .description('Display stats')
  .action((opts) => {
    StatController.getStats((err, stats) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        const table1 = new Table({
          head: [
            'Metric',
            'Number of teams'
          ]
        })

        table1.push(
          ['Total', stats.teams.total],
          ['Qualified', stats.teams.qualified],
          ['Disqualified', stats.teams.disqualified],
          ['Signed in during the competition', stats.teams.signedInDuringContest],
          ['Attempted to solve tasks', stats.teams.attemptedToSolveTasks],
          ['Solved at least one task', stats.teams.solvedAtLeastOneTask],
          ['Reviewed at least one task', stats.teams.reviewedAtLeastOneTask]
        )

        console.log(`Key metrics\n${table1.toString()}\n\n`)

        const table2 = new Table({
          head: [
            '#',
            'Country',
            'Number of teams'
          ]
        })

        table2.push.apply(table2, _.map(_.sortBy(_.pairs(stats.countries), (entry) => {
          return entry[1]
        }).reverse(), (entry, ndx) => {
          return [
            ndx + 1,
            entry[0],
            entry[1]
          ]
        }))
        console.log(`Country distribution\n${table2.toString()}\n\n`)

        process.exit(0)
      }
    })
  })

export default function run () {
  parser.parse(process.argv)
}

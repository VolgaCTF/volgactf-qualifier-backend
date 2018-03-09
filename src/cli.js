const logger = require('./utils/logger')
const parser = require('commander')
const prompt = require('prompt')
const SupervisorController = require('./controllers/supervisor')
const TeamController = require('./controllers/team')
const StatController = require('./controllers/stat')
const Table = require('cli-table')
const _ = require('underscore')
const numeral = require('numeral')
const moment = require('moment')

parser
  .command('create_supervisor')
  .description('Create supervisor')
  .option('-u, --username <username>', 'username')
  .option('-r, --rights <rights>', 'rights (admin, manager)')
  .action(function (options) {
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
      conform: function (confirmation) {
        if (prompt.history('password').value !== confirmation) {
          logger.error('Verification has failed')
          process.exit(1)
        } else {
          return true
        }
      }
    }], function (err, result) {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        let supervisorOpts = {
          username: options.username,
          password: result.password,
          rights: options.rights
        }
        SupervisorController.create(supervisorOpts, function (err, supervisor) {
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
  .action(function (options) {
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
      conform: function (confirmation) {
        if (prompt.history('new_password').value !== confirmation) {
          logger.err('Verification has failed')
          process.exit(1)
        } else {
          return true
        }
      }
    }], function (err, result) {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        let supervisorOpts = {
          username: options.username,
          password: result.new_password
        }
        SupervisorController.edit(supervisorOpts, function (err, supervisor) {
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
  .action(function (options) {
    SupervisorController.delete(options.username, function (err) {
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
  .action(function (opts) {
    SupervisorController.index(function (err, supervisors) {
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
  .action(function (options) {
    prompt.start()
    prompt.message = ''
    prompt.get([{
      name: 'confirmation',
      required: true,
      hidden: false,
      conform: function (confirmation) {
        if (confirmation !== 'yes') {
          logger.err('You should have typed yes')
          process.exit(1)
        } else {
          return true
        }
      }
    }], function (err, result) {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        let teamId = parseInt(options.teamId, 10)
        TeamController.disqualify(teamId, function (err) {
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
  .action(function (opts) {
    StatController.getStats(function (err, stats) {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        const table1 = new Table({
          head: [
            'Metric',
            'Value'
          ]
        })

        table1.push(
          ['Total', stats.teams.total],
          ['Qualified', stats.teams.qualified],
          ['Disqualified', stats.teams.disqualified],
          ['Signed in during the competition', stats.teams.signedInDuringContest],
          ['Submitted at least one flag', stats.teams.attemptedToSolveTasks],
          ['Solved at least one task', stats.teams.solvedAtLeastOneTask],
          ['Reviewed at least one task', stats.teams.reviewedAtLeastOneTask]
        )

        console.log(`Number of teams\n${table1.toString()}\n\n`)

        const table2 = new Table({
          head: [
            '#',
            'Country',
            'Number of teams'
          ]
        })

        table2.push.apply(table2, _.map(_.sortBy(_.pairs(stats.countries), function (entry) {
          return entry[1]
        }).reverse(), function (entry, ndx) {
          return [
            ndx + 1,
            entry[0],
            entry[1]
          ]
        }))
        console.log(`Team/country distribution\n${table2.toString()}\n\n`)

        for (const task in stats.tasks) {
          const table3 = new Table({
            head: [
              'Metric',
              'Value'
            ]
          })
          const taskData = stats.tasks[task]
          table3.push(
            ['Value', taskData.value],
            ['Categories', taskData.categories.join(', ')],
            ['Opened', (taskData.opened === null) ? 'n/a' : moment(taskData.opened).format('lll')],
            ['Flags submitted for this task', taskData.flagsSubmitted],
            ['First flag submitted', (taskData.firstSubmit === null) ? 'n/a' : moment(taskData.firstSubmit).format('lll')],
            ['Last flag submitted', (taskData.lastSubmit === null) ? 'n/a' : moment(taskData.lastSubmit).format('lll')],
            ['Teams solved this task', taskData.teamsSolved],
            ['First solved', (taskData.firstSolved === null) ? 'n/a' : moment(taskData.firstSolved).format('lll')],
            ['Last solved', (taskData.lastSolved === null) ? 'n/a' : moment(taskData.lastSolved).format('lll')],
            ['Reviews', taskData.reviews],
            ['Average rating', (taskData.averageRating === null) ? 'n/a' : numeral(taskData.averageRating).format('0.00')]
          )
          console.log(`Task ${task}\n${table3.toString()}\n\n`)
        }
        process.exit(0)
      }
    })
  })

function run () {
  parser.parse(process.argv)
}

module.exports = run

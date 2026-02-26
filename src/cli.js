const logger = require('./utils/logger')
const inquirer = require('inquirer')
const SupervisorController = require('./controllers/supervisor')
const TeamController = require('./controllers/team')
const StatController = require('./controllers/stat')
const Table = require('cli-table3')
const _ = require('underscore')
const numeral = require('numeral')
const moment = require('moment')
const { Command } = require('commander')
const parser = new Command()

parser
  .command('create_supervisor')
  .description('Create supervisor')
  .requiredOption('-u, --username <username>', 'username')
  .requiredOption('-r, --rights <rights>', 'rights (admin, manager)')
  .requiredOption('-e --email <email>', 'email')
  .action(async function (options) {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
          validate: (input) => input ? true : 'Password is required'
        },
        {
          type: 'password',
          name: 'confirmation',
          message: 'Confirm password:',
          mask: '*',
          validate: (input, answers) => {
            if (!input) return 'Confirmation is required'
            if (input !== answers.password) {
              return 'Verification has failed'
            }
            return true
          }
        }
      ])

      const supervisorOpts = {
        username: options.username,
        password: answers.password,
        rights: options.rights,
        email: options.email
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

    } catch (err) {
      logger.error(err)
      process.exit(1)
    }
  })

parser
  .command('change_supervisor_password')
  .description("Change supervisor's password")
  .requiredOption('-u, --username <user>', 'username')
  .action(async function (options) {
    try {
      // Prompt for new password and confirmation
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'new_password',
          message: 'Enter new password:',
          mask: '*',
          validate: (input) => input ? true : 'Password is required',
        },
        {
          type: 'password',
          name: 'confirmation',
          message: 'Confirm new password:',
          mask: '*',
          validate: (input, answers) => {
            if (!input) return 'Confirmation is required';
            if (input !== answers.new_password) return 'Verification has failed';
            return true;
          },
        },
      ]);

      // Build supervisor options
      const supervisorOpts = {
        username: options.username,
        password: answers.new_password,
      };

      // Call controller
      SupervisorController.edit(supervisorOpts, (err, supervisor) => {
        if (err) {
          logger.error(err);
          process.exit(1);
        } else {
          logger.info(`Password for supervisor ${options.username} has been updated!`);
          process.exit(0);
        }
      });

    } catch (err) {
      logger.error(err);
      process.exit(1);
    }
  })

parser
  .command('delete_supervisor')
  .description('Delete supervisor user')
  .requiredOption('-u, --username <username', 'username')
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
        for (const supervisor of supervisors) {
          logger.info(`Supervisor #${supervisor.id} ${supervisor.username} (${supervisor.rights})`)
        }
        process.exit(0)
      }
    })
  })

parser
  .command('disqualify_team')
  .description('Disqualify team')
  .requiredOption('-t, --team-id <team>', 'teamId')
  .action(async function (options) {
    try {
      // Ask for confirmation
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'confirmation',
          message: 'Type "yes" to confirm disqualification:',
          validate: (input) => {
            if (input !== 'yes') return 'You should type "yes" to proceed';
            return true;
          },
        },
      ]);

      // Parse team ID
      const teamId = parseInt(options.teamId, 10);

      // Call the controller
      TeamController.disqualify(teamId, (err) => {
        if (err) {
          logger.error(err);
          process.exit(1);
        } else {
          logger.info(`Team ${teamId} has been disqualified!`);
          process.exit(0);
        }
      });
    } catch (err) {
      logger.error(err);
      process.exit(1);
    }
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

        const table11 = new Table({
          head: [
            'Number of tasks',
            'Number of teams'
          ]
        })

        table11.push.apply(table11, _.map(stats.teamSubmitDistribution, function (entry) {
          return [
            entry.numTasks,
            entry.numTeams
          ]
        }))
        console.log(`Task/team submit attempts distribution\n${table11.toString()}\n\n`)

        const table12 = new Table({
          head: [
            'Number of tasks',
            'Number of teams'
          ]
        })

        table12.push.apply(table12, _.map(stats.teamHitDistribution, function (entry) {
          return [
            entry.numTasks,
            entry.numTeams
          ]
        }))
        console.log(`Task/team hit distribution\n${table12.toString()}\n\n`)

        const table13 = new Table({
          head: [
            'Number of tasks',
            'Number of teams'
          ]
        })

        table13.push.apply(table13, _.map(stats.teamReviewDistribution, function (entry) {
          return [
            entry.numTasks,
            entry.numTeams
          ]
        }))
        console.log(`Task/team review distribution\n${table13.toString()}\n\n`)

        const table14 = new Table({
          head: [
            'Timestamp',
            'Number of teams'
          ]
        })

        table14.push.apply(table14, _.map(stats.signinDistribution, function (entry) {
          return [
            moment(entry.timestamp).utc().format('MMM D HH:[00:00]-HH:[59:59] [UTC]'),
            entry.numTeams
          ]
        }))
        console.log(`Unique team sign in distribution during the competition\n${table14.toString()}\n\n`)

        const table15 = new Table({
          head: [
            'Timestamp',
            'Number of teams'
          ]
        })

        table15.push.apply(table15, _.map(stats.signupDistribution, function (entry) {
          return [
            moment(entry.timestamp).utc().format('MMM D [UTC]'),
            entry.numTeams
          ]
        }))
        console.log(`Team sign up distribution\n${table15.toString()}\n\n`)

        const table2 = new Table({
          head: [
            '#',
            'Country',
            'Number of teams'
          ]
        })

        table2.push.apply(table2, _.map(stats.countryDistribution, function (entry, ndx) {
          return [
            ndx + 1,
            entry.countryName,
            entry.numTeams
          ]
        }))
        console.log(`Team/country distribution\n${table2.toString()}\n\n`)

        const table21 = new Table({
          head: [
            '#',
            'Country',
            'Number of teams'
          ]
        })

        table21.push.apply(table21, _.map(stats.countryDistributionPopular, function (entry, ndx) {
          return [
            ndx + 1,
            entry.countryName,
            entry.numTeams
          ]
        }))
        console.log(`Top 10 countries: Team/country distribution\n${table21.toString()}\n\n`)

        for (const task of stats.tasks) {
          const table3 = new Table({
            head: [
              'Metric',
              'Value'
            ]
          })
          table3.push(
            ['Value', task.value],
            ['Categories', task.categories.join(', ')],
            ['Opened', (task.opened === null) ? 'n/a' : moment(task.opened).utc().format('MMM D [at] HH:mm [UTC]')],
            ['Flags submitted for this task', task.flagsSubmitted],
            ['First flag submitted', (task.firstSubmit === null) ? 'n/a' : moment(task.firstSubmit).utc().format('MMM D [at] HH:mm [UTC]')],
            ['Last flag submitted', (task.lastSubmit === null) ? 'n/a' : moment(task.lastSubmit).utc().format('MMM D [at] HH:mm [UTC]')],
            ['Teams solved this task', task.teamsSolved],
            ['First solved', (task.firstSolved === null) ? 'n/a' : `${task.firstSolvedTeam}\n${moment(task.firstSolved).utc().format('MMM D [at] HH:mm [UTC]')}`],
            ['Last solved', (task.lastSolved === null) ? 'n/a' : moment(task.lastSolved).utc().format('MMM D [at] HH:mm [UTC]')],
            ['Reviews', task.reviews],
            ['Average rating', (task.averageRating === null) ? 'n/a' : numeral(task.averageRating).format('0.00')]
          )
          console.log(`Task "${task.title}"\n${table3.toString()}\n\n`)

          const table31 = new Table({
            head: [
              'Timestamp',
              'Number of hit attempts'
            ]
          })

          table31.push.apply(table31, _.map(task.hitAttemptDistribution, function (entry) {
            return [
              moment(entry.timestamp).utc().format('MMM D HH:[00:00]-HH:[59:59] [UTC]'),
              entry.numHitAttempts
            ]
          }))
          const rawHitAttemptDistribution = _.map(task.hitAttemptDistribution, function (entry) {
            return entry.numHitAttempts
          })
          console.log(`Task "${task.title}" hit attempts distribution\n${table31.toString()}\nRaw data:\n${JSON.stringify(rawHitAttemptDistribution)}\n\n`)

          const table32 = new Table({
            head: [
              'Timestamp',
              'Number of hits'
            ]
          })

          table32.push.apply(table32, _.map(task.hitDistribution, function (entry) {
            return [
              moment(entry.timestamp).utc().format('MMM D HH:[00:00]-HH:[59:59] [UTC]'),
              entry.numHits
            ]
          }))
          const rawHitDistribution = _.map(task.hitDistribution, function (entry) {
            return entry.numHits
          })
          console.log(`Task "${task.title}" hits distribution\n${table32.toString()}\nRaw data:\n${JSON.stringify(rawHitDistribution)}\n\n`)

          const table33 = new Table({
            head: [
              'Timestamp',
              'Number of reviews'
            ]
          })

          table33.push.apply(table33, _.map(task.reviewDistribution, function (entry) {
            return [
              moment(entry.timestamp).utc().format('MMM D HH:[00:00]-HH:[59:59] [UTC]'),
              entry.numReviews
            ]
          }))
          console.log(`Task "${task.title}" reviews distribution\n${table33.toString()}\n\n`)

          const table34 = new Table({
            head: [
              'Timestamp',
              'Team',
              'Rating',
              'Comment'
            ],
            colWidths: [17, 20, 8, 60],
            wordWrap: true,
            wrapOnWordBoundary: false
          })

          table34.push.apply(table34, _.map(task.reviewsDetailed, function (entry) {
            return [
              moment(entry.timestamp).utc().format('MM/DD HH:mm [UTC]'),
              entry.team,
              entry.rating,
              entry.comment
            ]
          }))
          console.log(`Task "${task.title}" reviews\n${table34.toString()}\n\n`)
        }
        process.exit(0)
      }
    })
  })

function run () {
  parser.parse(process.argv)
}

module.exports = run

import parser from 'nomnom'
import logger from './utils/logger'

import SupervisorController from './controllers/supervisor'

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

parser.command('delete_supervisor')
  .help('Delete supervisor user')
  .option('username', {
    required: true,
    abbr: 'u',
    help: 'User name'
  })
  .callback((opts) => {
    SupervisorController.delete(opts.username, (err) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        logger.info(`Supervisor ${opts.username} has been deleted!`)
        process.exit(0)
      }
    })
  })

parser.command('index_supervisors')
  .help('Index all supervisors')
  .callback((opts) => {
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

export default function run () {
  parser.parse()
}

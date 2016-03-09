//import parser from 'nomnom'
import logger from './utils/logger'
import program from 'commander'
import promp from 'prompt'
import SupervisorController from './controllers/supervisor'
//import TeamController from './controllers/team'

program.
	version('2.9.0')
//let name
program
	.command('hi')
	.description('TEST COMMAND')
	.option("-u, --username <user>", "add username")
	.option("-r, --rights <credents>", "add rights")
	//.parse(process.argv)
	.action((options) => {
	  promp.start()
	  promp.message = ''
	  promp.get([{
   	      name: 'password',
	      required: true,
	      hidden: true
	    }, { 
	      name: 'confirmation',
	      required: true,
	      hidden: true,
	      conform: ((confirmation) => {
	        return (promp.history('password').value == confirmation)
	      })	      
	    }], ((err, result) => {
	    if (err) {
	    logger.error(err)
	    process.exit(1)
	    } else { 
	      logger.info(`You entered ${result.password}`)
	      logger.info(`${options.username} user`)
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
	  )
	  //logger.info (`Please, ${options.username}, works!`)
	})
	.parse(process.argv)

program 
	.command('ho')
	.description('second test command')
	.option("-m, --mainname <main>", "test param")
	.action((options) => {
	  logger.info (`How about ${options.mainname}?!`)
	})
	.parse(process.argv)
/* parser.command('create_supervisor')
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
        for (let supervisor of supervisors) {
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
        for (let team of teams) {
          logger.info(`Team ${team.name} <${team.email}>`)
        }
        process.exit(0)
      }
    })
  })
*/
export default function run () {
  //parser.parse()
  program.parse(process.argv)
}


import logger from './utils/logger'
import parser from 'commander'
import prompt from 'prompt'
import SupervisorController from './controllers/supervisor'


parser
  .command('create_supervisor')
  .description('Create supervisor user')
  .option("-u, --username <username>", "add username")
  .option("-r, --rights <rights>", "add rights")
  .parse(process.argv)
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
	conform: ((confirmation) => {
	  if (prompt.history('password').value !== confirmation) {
            logger.err('Verification has failed')
	    process.exit(1)
	  } else {
	    return true
	  }
	})	      
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
  .command('edit_password')
  .description('Edit password for supervisors')
  .option("-u, --username <user>", "username")
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
	conform: ((confirmation) => {
	  if (prompt.history('new_password').value !== confirmation) {
            logger.err('Verification is failed')
	    process.exit(1)
	  } else {
	    return true
	  }
	})	      
      }], (err, result) => {
      if (err) {
	logger.error(err)
	process.exit(1)
      } else { 
	let supervisorOpts = {
      	  username: options.username,
      	  password: result.new_password,
    	}
    	SupervisorController.edit(supervisorOpts, (err, supervisor) => {
          if (err) {
            logger.error(err)
            process.exit(1)
          } else {
            logger.info(`Password for user ${options.username} has been edited!`)
            process.exit(0)
          }
        })
      }
    })
  })
	
parser
  .command('remove_supervisor')
  .description('Remove supervisor user')
  .option("-u, --username <username", "username")
  .action((options) => {
    SupervisorController.remove(options.username, (err) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      } else {
        logger.info(`Supervisor ${options.username} has been removed!`)
        process.exit(0)
      }
    })
  })

parser
  .command('list_supervisors')
  .description('List all supervisors')
  .action((opts) => {
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


export default function run () { 
  parser.parse(process.argv)
}


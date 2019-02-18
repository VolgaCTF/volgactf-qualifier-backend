const cluster = require('cluster');
const logger = require('../utils/logger')
const eventStream = require('../controllers/event-stream')

function getNumProcesses () {
  return parseInt(process.env.THEMIS_QUALS_NUM_PROCESSES || '2', 10)
}

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`)

  // Fork workers.
  for (let i=0; i<getNumProcesses(); i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.info(`Worker ${worker.process.pid} died`)
  })
} else {
  require('../queue')
  eventStream.run()
  logger.info(`Worker ${process.pid} started`)
}

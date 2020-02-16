const cluster = require('cluster')
const logger = require('../utils/logger')
const eventStream = require('../controllers/event-stream')

function getNumProcesses () {
  return parseInt(process.env.VOLGACTF_QUALIFIER_NUM_PROCESSES || '2', 10)
}

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`)

  for (let i = 0; i < getNumProcesses(); i++) {
    cluster.fork()
  }

  cluster.on('online', function (worker) {
    logger.info(`Worker ${worker.process.pid} started`)
  })

  cluster.on('exit', function (worker, code, signal) {
    logger.info(`Worker ${worker.process.pid} died`)
    cluster.fork()
  })
} else {
  require('../queue')
  eventStream.run()
}

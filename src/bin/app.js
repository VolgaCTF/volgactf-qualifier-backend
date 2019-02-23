const cluster = require('cluster')
const app = require('../app')
const logger = require('../utils/logger')
const eventStream = require('../controllers/event-stream')

function getNumProcesses () {
  return parseInt(process.env.THEMIS_QUALS_NUM_PROCESSES || '2', 10)
}

function getServerPort () {
  return parseInt(process.env.THEMIS_QUALS_PORT || '8000', 10)
}

function getServerHost () {
  return process.env.THEMIS_QUALS_HOST || '127.0.0.1'
}

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`)

  for (let i=0; i<getNumProcesses(); i++) {
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
  let server = app.listen(getServerPort(), getServerHost(), function () {
    logger.info(`Worker ${process.pid}, server listening on ${server.address().address}:${server.address().port}`)
    eventStream.run()
  })
}

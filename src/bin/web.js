const web = require('../web')
const logger = require('../utils/logger')
const eventStream = require('../controllers/event-stream')

function getServerPort () {
  return parseInt(process.argv[2] || '8000', 10)
}

function getServerHost () {
  return process.env.VOLGACTF_QUALIFIER_HOST || '0.0.0.0'
}

const server = web.listen(getServerPort(), getServerHost(), function () {
  logger.info(`Worker ${process.pid}, server listening on ${server.address().address}:${server.address().port}`)
  eventStream.run()
})

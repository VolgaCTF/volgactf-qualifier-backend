import app from '../app'
import logger from '../utils/logger'
import eventStream from '../controllers/event-stream'

function getServerPort () {
  return parseInt(process.env.THEMIS_PORT, 10) || 3000
}

let hostname = process.env.THEMIS_HOSTNAME || '127.0.0.1'

var server = app.listen(getServerPort(), hostname, () => {
  logger.info(`Server listening on ${server.address().address}:${server.address().port}`)
  eventStream.run()
})

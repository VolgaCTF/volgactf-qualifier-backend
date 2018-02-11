const app = require('../app')
const logger = require('../utils/logger')
const eventStream = require('../controllers/event-stream')

function getServerPort () {
  return 3000 + (parseInt(process.env.NODE_APP_INSTANCE, 10) || 0)
}

let hostname = process.env.THEMIS_QUALS_HOST || '127.0.0.1'

var server = app.listen(getServerPort(), hostname, function () {
  logger.info(`Server listening on ${server.address().address}:${server.address().port}`)
  eventStream.run()
})

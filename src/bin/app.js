import app from '../app'
import logger from '../utils/logger'
import eventStream from '../controllers/event-stream'

function getServerPort () {
  return parseInt(process.env.PORT, 10) || 3000
}

var server = app.listen(getServerPort(), () => {
  var port = server.address().port
  logger.info(`Server listening on port ${port}`)
  eventStream.run()
})

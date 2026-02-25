const logger = require('../utils/logger')
const eventStream = require('../controllers/event-stream')

require('../queue')

logger.info(`Queue worker ${process.pid} is running`)
eventStream.run()

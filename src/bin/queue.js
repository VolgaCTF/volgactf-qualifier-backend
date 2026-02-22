const logger = require('../utils/logger')
const eventStream = require('../controllers/event-stream')

require('../queue')

const processIndex = process.argv[2] ? `process ${process.argv[2]}` : 'single process';
logger.info(`Queue ${process.pid} is running, ${processIndex}`)
eventStream.run()

const scheduler = require('../scheduler')

process.on('SIGINT', function () {
  scheduler.shutdown()
  process.exit()
})

scheduler.run()

import scheduler from '../scheduler'

process.on('SIGINT', function () {
  scheduler.shutdown()
  process.exit()
})

scheduler.run()

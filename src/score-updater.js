import queue from './utils/queue'

let queueTask = function() {
  queue('updateScoresQueue').add()
}

export function run() {
  setInterval(queueTask, 60000)
}

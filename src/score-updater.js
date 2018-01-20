import queue from './utils/queue'

let updateScoresInterval = 60
if (process.env.THEMIS_QUALS_UPDATE_SCORES_INTERVAL) {
  updateScoresInterval = parseInt(process.env.THEMIS_QUALS_UPDATE_SCORES_INTERVAL, 10)
}

export default function run () {
  setInterval(() => {
    queue('updateScoresQueue').add()
  }, updateScoresInterval * 1000)
}

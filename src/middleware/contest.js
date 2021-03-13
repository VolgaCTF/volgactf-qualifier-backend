const ContestController = require('../controllers/contest')
const { ContestFinishedError, ContestPausedError, ContestNotStartedError, InternalError } = require('../utils/errors')
const axios = require('axios')

function getContest (request, response, next) {
  ContestController.get(function (err, contest) {
    if (err) {
      next(err)
    } else {
      request.contest = contest
      next()
    }
  })
}
module.exports.getContest = getContest

let contestTitle = null

function getContestTitle (request, response, next) {
  if (contestTitle) {
    request.contestTitle = contestTitle
    next()
  } else {
    const customizerHost = process.env.VOLGACTF_QUALIFIER_CUSTOMIZER_HOST
    const customizerPort = parseInt(process.env.VOLGACTF_QUALIFIER_CUSTOMIZER_PORT, 10)
    const url = `http://${customizerHost}:${customizerPort}/event-title`
    axios.get(url)
      .then(function (response) {
        contestTitle = response.data
        request.contestTitle = contestTitle
        next()
      })
      .catch(function (err) {
        next(err)
      })
  }
}
module.exports.getContestTitle = getContestTitle

function contestNotFinished (request, response, next) {
  ContestController.get(function (err, contest) {
    if (err) {
      next(err)
    } else {
      if (contest && contest.isFinished()) {
        next(new ContestFinishedError())
      } else {
        next()
      }
    }
  })
}
module.exports.contestNotFinished = contestNotFinished

function contestIsStarted (request, response, next) {
  ContestController.get(function (err, contest) {
    if (err) {
      next(err)
    } else {
      if (contest && contest.isStarted()) {
        next()
      } else {
        if (contest) {
          if (contest.isPaused()) {
            next(new ContestPausedError())
          } else if (contest.isFinished()) {
            next(new ContestFinishedError())
          } else {
            next(new ContestNotStartedError())
          }
        } else {
          next(new ContestNotStartedError())
        }
      }
    }
  })
}
module.exports.contestIsStarted = contestIsStarted

function contestIsFinished (request, response, next) {
  ContestController.get(function (err, contest) {
    if (err) {
      next(err)
    } else {
      if (contest && contest.isFinished()) {
        next()
      } else {
        next(new InternalError())
      }
    }
  })
}
module.exports.contestIsFinished = contestIsFinished

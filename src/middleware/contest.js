const ContestController = require('../controllers/contest')
const { ContestFinishedError, ContestPausedError, ContestNotStartedError, InternalError } = require('../utils/errors')

function getState (request, response, next) {
  ContestController.get(function (err, contest) {
    if (err) {
      next(err)
    } else {
      request.contest = contest
      next()
    }
  })
}
module.exports.getState = getState

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

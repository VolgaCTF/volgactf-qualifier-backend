import ContestController from '../controllers/contest'
import constants from '../utils/constants'
import errors from '../utils/errors'


export function getState(request, response, next) {
  ContestController.get((err, contest) => {
    if (err) {
      next(err)
    } else {
      request.contest = contest
      next()
    }
  })
}


export function contestNotFinished(request, response, next) {
  ContestController.get((err, contest) => {
    if (err) {
      next(err)
    } else {
      if (contest && contest.isFinished()) {
        next(new errors.ContestFinishedError())
      } else {
        next()
      }
    }
  })
}


export function contestIsStarted(request, response, next) {
  ContestController.get((err, contest) => {
    if (err) {
      next(err)
    } else {
      if (contest && contest.isStarted()) {
        next()
      } else {
        if (contest) {
          if (contest.isPaused()) {
            next(new errors.ContestPausedError())
          } else if (contest.isFinished()) {
            next(new errors.ContestFinishedError())
          } else {
            next(new errors.ContestNotStartedError())
          }
        } else {
          next(new errors.ContestNotStartedError())
        }
      }
    }
  })
}


export function contestIsFinished(request, response, next) {
  ContestController.get((err, contest) => {
    if (err) {
      next(err)
    } else {
      if (contest && contest.isFinished()) {
        next()
      } else {
        next(new errors.InternalError())
      }
    }
  })
}

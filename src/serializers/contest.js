const { CONTEST_INITIAL } = require('../utils/constants')

module.exports = function (contest) {
  if (contest) {
    return {
      state: contest.state,
      startsAt: contest.startsAt.getTime(),
      finishesAt: contest.finishesAt.getTime()
    }
  } else {
    return {
      state: CONTEST_INITIAL,
      startsAt: null,
      finishesAt: null
    }
  }
}

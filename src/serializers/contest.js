import constants from '../utils/constants'

export default function(contest) {
  if (contest) {
    return {
      state: contest.state,
      startsAt: contest.startsAt.getTime(),
      finishesAt: contest.finishesAt.getTime()
    }
  } else {
    return {
      state: constants.CONTEST_INITIAL,
      startsAt: null,
      finishesAt: null
    }
  }
}

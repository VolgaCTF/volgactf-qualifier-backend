
export default {
  TASK_INITIAL: 1,
  TASK_OPENED: 2,
  TASK_CLOSED: 3,

  CONTEST_INITIAL: 1,
  CONTEST_STARTED: 2,
  CONTEST_PAUSED: 3,
  CONTEST_FINISHED: 4,

  TASK_MIN_VALUE: 10,
  TASK_MAX_VALUE: 1000,
  TASK_MAX_HINTS: 10,
  TASK_MAX_CATEGORIES: 5,
  TASK_MAX_ANSWERS: 15,

  TASK_SUBMIT_LIMIT_TIME: 10,
  TASK_SUBMIT_LIMIT_ATTEMPTS: 3,

  POSTGRES_UNIQUE_CONSTRAINT_VIOLATION: '23505',
  POSTGRES_FOREIGN_KEY_CONSTRAINT_VIOLATION: '23503',

  EVENT_UPDATE_CONTEST: 1,

  EVENT_CREATE_SUPERVISOR: 21,
  EVENT_REMOVE_SUPERVISOR: 22,
  EVENT_LOGIN_SUPERVISOR: 23,
  EVENT_LOGOUT_SUPERVISOR: 24,

  EVENT_CREATE_CATEGORY: 41,
  EVENT_UPDATE_CATEGORY: 42,
  EVENT_REMOVE_CATEGORY: 43,

  EVENT_CREATE_POST: 61,
  EVENT_UPDATE_POST: 62,
  EVENT_REMOVE_POST: 63,

  EVENT_CREATE_TASK: 81,
  EVENT_UPDATE_TASK: 82,
  EVENT_OPEN_TASK: 83,
  EVENT_CLOSE_TASK: 84,

  EVENT_CREATE_TEAM: 101,
  EVENT_UPDATE_TEAM_EMAIL: 102,
  EVENT_UPDATE_TEAM_PROFILE: 103,
  EVENT_UPDATE_TEAM_PASSWORD: 104,
  EVENT_UPDATE_TEAM_LOGO: 105,
  EVENT_UPDATE_TEAM_SCORE: 106,
  EVENT_QUALIFY_TEAM: 107,
  EVENT_DISQUALIFY_TEAM: 108,
  EVENT_LOGIN_TEAM: 109,
  EVENT_LOGOUT_TEAM: 110,

  EVENT_CREATE_TASK_CATEGORY: 121,
  EVENT_REMOVE_TASK_CATEGORY: 122,
  EVENT_REVEAL_TASK_CATEGORY: 123,

  EVENT_CREATE_TEAM_TASK_HIT: 141,
  EVENT_CREATE_TEAM_TASK_HIT_ATTEMPT: 142
}

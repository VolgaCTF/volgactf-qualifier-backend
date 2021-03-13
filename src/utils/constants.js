module.exports.SCOPE_GUEST = 1
module.exports.SCOPE_TEAM = 2
module.exports.SCOPE_MANAGER = 3
module.exports.SCOPE_ADMIN = 4

module.exports.TASK_INITIAL = 1
module.exports.TASK_OPENED = 2
module.exports.TASK_CLOSED = 3

module.exports.CONTEST_INITIAL = 1
module.exports.CONTEST_STARTED = 2
module.exports.CONTEST_PAUSED = 3
module.exports.CONTEST_FINISHED = 4

module.exports.TASK_MIN_VALUE = 1
module.exports.TASK_MAX_VALUE = 1000
module.exports.TASK_MAX_HINTS = 10
module.exports.TASK_MAX_CATEGORIES = 5
module.exports.TASK_MAX_ANSWERS = 15

module.exports.TASK_SUBMIT_LIMIT_TIME = 10
module.exports.TASK_SUBMIT_LIMIT_ATTEMPTS = 3

module.exports.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION = '23505'
module.exports.POSTGRES_FOREIGN_KEY_CONSTRAINT_VIOLATION = '23503'

module.exports.EVENT_UPDATE_CONTEST = 1

module.exports.EVENT_CREATE_SUPERVISOR = 21
module.exports.EVENT_DELETE_SUPERVISOR = 22
module.exports.EVENT_LOGIN_SUPERVISOR = 23
module.exports.EVENT_LOGOUT_SUPERVISOR = 24
module.exports.EVENT_UPDATE_SUPERVISOR_PASSWORD = 25

module.exports.EVENT_CREATE_CATEGORY = 41
module.exports.EVENT_UPDATE_CATEGORY = 42
module.exports.EVENT_DELETE_CATEGORY = 43

module.exports.EVENT_CREATE_POST = 61
module.exports.EVENT_UPDATE_POST = 62
module.exports.EVENT_DELETE_POST = 63

module.exports.EVENT_CREATE_TASK = 81
module.exports.EVENT_UPDATE_TASK = 82
module.exports.EVENT_OPEN_TASK = 83
module.exports.EVENT_CLOSE_TASK = 84

module.exports.EVENT_CREATE_TEAM = 101
module.exports.EVENT_UPDATE_TEAM_EMAIL = 102
module.exports.EVENT_UPDATE_TEAM_PROFILE = 103
module.exports.EVENT_UPDATE_TEAM_PASSWORD = 104
module.exports.EVENT_UPDATE_TEAM_LOGO = 105
module.exports.EVENT_QUALIFY_TEAM = 107
module.exports.EVENT_DISQUALIFY_TEAM = 108
module.exports.EVENT_LOGIN_TEAM = 109
module.exports.EVENT_LOGOUT_TEAM = 110
module.exports.EVENT_LINK_TEAM_CTFTIME = 111

module.exports.EVENT_CREATE_TASK_CATEGORY = 121
module.exports.EVENT_DELETE_TASK_CATEGORY = 122
module.exports.EVENT_REVEAL_TASK_CATEGORY = 123

module.exports.EVENT_CREATE_TEAM_TASK_HIT = 141
module.exports.EVENT_CREATE_TEAM_TASK_HIT_ATTEMPT = 142

module.exports.EVENT_CREATE_TEAM_TASK_REVIEW = 161

module.exports.EVENT_CREATE_REMOTE_CHECKER = 171
module.exports.EVENT_UPDATE_REMOTE_CHECKER = 172
module.exports.EVENT_DELETE_REMOTE_CHECKER = 173

module.exports.EVENT_CREATE_TASK_REMOTE_CHECKER = 181

module.exports.EVENT_CREATE_TASK_VALUE = 191
module.exports.EVENT_UPDATE_TASK_VALUE = 192
module.exports.EVENT_REVEAL_TASK_VALUE = 193

module.exports.EVENT_CREATE_TASK_REWARD_SCHEME = 201
module.exports.EVENT_UPDATE_TASK_REWARD_SCHEME = 202
module.exports.EVENT_REVEAL_TASK_REWARD_SCHEME = 203

module.exports.EVENT_UPDATE_TEAM_RANKINGS = 211

module.exports.EVENT_CREATE_TASK_FILE = 221
module.exports.EVENT_DELETE_TASK_FILE = 222

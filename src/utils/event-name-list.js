const { EVENT_UPDATE_CONTEST, EVENT_CREATE_SUPERVISOR, EVENT_DELETE_SUPERVISOR, EVENT_LOGIN_SUPERVISOR,
  EVENT_LOGOUT_SUPERVISOR, EVENT_UPDATE_SUPERVISOR_PASSWORD, EVENT_CREATE_CATEGORY, EVENT_UPDATE_CATEGORY,
  EVENT_DELETE_CATEGORY, EVENT_CREATE_POST, EVENT_UPDATE_POST, EVENT_DELETE_POST, EVENT_CREATE_TASK, EVENT_UPDATE_TASK,
  EVENT_OPEN_TASK, EVENT_CLOSE_TASK, EVENT_CREATE_TEAM, EVENT_UPDATE_TEAM_EMAIL, EVENT_UPDATE_TEAM_PROFILE,
  EVENT_UPDATE_TEAM_PASSWORD, EVENT_UPDATE_TEAM_LOGO, EVENT_QUALIFY_TEAM, EVENT_DISQUALIFY_TEAM,
  EVENT_LOGIN_TEAM, EVENT_LOGOUT_TEAM, EVENT_LINK_TEAM_CTFTIME, EVENT_CREATE_TASK_CATEGORY,
  EVENT_DELETE_TASK_CATEGORY, EVENT_REVEAL_TASK_CATEGORY, EVENT_CREATE_TEAM_TASK_HIT,
  EVENT_CREATE_TEAM_TASK_HIT_ATTEMPT, EVENT_CREATE_TEAM_TASK_REVIEW, EVENT_CREATE_REMOTE_CHECKER,
  EVENT_UPDATE_REMOTE_CHECKER, EVENT_DELETE_REMOTE_CHECKER, EVENT_CREATE_TASK_REMOTE_CHECKER,
  EVENT_CREATE_TASK_VALUE, EVENT_UPDATE_TASK_VALUE, EVENT_REVEAL_TASK_VALUE,
  EVENT_CREATE_TASK_REWARD_SCHEME, EVENT_UPDATE_TASK_REWARD_SCHEME, EVENT_REVEAL_TASK_REWARD_SCHEME,
  EVENT_UPDATE_TEAM_RANKINGS, EVENT_CREATE_TASK_FILE, EVENT_DELETE_TASK_FILE
 } = require('./constants')

class EventNameList {
  constructor () {
    this.eventNames = {}
    this.fillList()
  }

  fillList () {
    this.eventNames[EVENT_UPDATE_CONTEST] = 'updateContest'

    this.eventNames[EVENT_CREATE_SUPERVISOR] = 'createSupervisor'
    this.eventNames[EVENT_DELETE_SUPERVISOR] = 'deleteSupervisor'
    this.eventNames[EVENT_LOGIN_SUPERVISOR] = 'loginSupervisor'
    this.eventNames[EVENT_LOGOUT_SUPERVISOR] = 'logoutSupervisor'
    this.eventNames[EVENT_UPDATE_SUPERVISOR_PASSWORD] = 'updateSupervisorPassword'

    this.eventNames[EVENT_CREATE_CATEGORY] = 'createCategory'
    this.eventNames[EVENT_UPDATE_CATEGORY] = 'updateCategory'
    this.eventNames[EVENT_DELETE_CATEGORY] = 'deleteCategory'

    this.eventNames[EVENT_CREATE_POST] = 'createPost'
    this.eventNames[EVENT_UPDATE_POST] = 'updatePost'
    this.eventNames[EVENT_DELETE_POST] = 'deletePost'

    this.eventNames[EVENT_CREATE_TASK] = 'createTask'
    this.eventNames[EVENT_UPDATE_TASK] = 'updateTask'
    this.eventNames[EVENT_OPEN_TASK] = 'openTask'
    this.eventNames[EVENT_CLOSE_TASK] = 'closeTask'

    this.eventNames[EVENT_CREATE_TEAM] = 'createTeam'
    this.eventNames[EVENT_UPDATE_TEAM_EMAIL] = 'updateTeamEmail'
    this.eventNames[EVENT_UPDATE_TEAM_PROFILE] = 'updateTeamProfile'
    this.eventNames[EVENT_UPDATE_TEAM_PASSWORD] = 'updateTeamPassword'
    this.eventNames[EVENT_UPDATE_TEAM_LOGO] = 'updateTeamLogo'
    this.eventNames[EVENT_QUALIFY_TEAM] = 'qualifyTeam'
    this.eventNames[EVENT_DISQUALIFY_TEAM] = 'disqualifyTeam'
    this.eventNames[EVENT_LOGIN_TEAM] = 'loginTeam'
    this.eventNames[EVENT_LOGOUT_TEAM] = 'logoutTeam'
    this.eventNames[EVENT_LINK_TEAM_CTFTIME] = 'linkTeamCTFtime'

    this.eventNames[EVENT_CREATE_TASK_CATEGORY] = 'createTaskCategory'
    this.eventNames[EVENT_DELETE_TASK_CATEGORY] = 'deleteTaskCategory'
    this.eventNames[EVENT_REVEAL_TASK_CATEGORY] = 'revealTaskCategory'

    this.eventNames[EVENT_CREATE_TEAM_TASK_HIT] = 'createTeamTaskHit'
    this.eventNames[EVENT_CREATE_TEAM_TASK_HIT_ATTEMPT] = 'createTeamTaskHitAttempt'

    this.eventNames[EVENT_CREATE_TEAM_TASK_REVIEW] = 'createTeamTaskReview'

    this.eventNames[EVENT_CREATE_REMOTE_CHECKER] = 'createRemoteChecker'
    this.eventNames[EVENT_UPDATE_REMOTE_CHECKER] = 'updateRemoteChecker'
    this.eventNames[EVENT_DELETE_REMOTE_CHECKER] = 'deleteRemoteChecker'

    this.eventNames[EVENT_CREATE_TASK_REMOTE_CHECKER] = 'createTaskRemoteChecker'

    this.eventNames[EVENT_CREATE_TASK_VALUE] = 'createTaskValue'
    this.eventNames[EVENT_UPDATE_TASK_VALUE] = 'updateTaskValue'
    this.eventNames[EVENT_REVEAL_TASK_VALUE] = 'revealTaskValue'

    this.eventNames[EVENT_CREATE_TASK_REWARD_SCHEME] = 'createTaskRewardScheme'
    this.eventNames[EVENT_UPDATE_TASK_REWARD_SCHEME] = 'updateTaskRewardScheme'
    this.eventNames[EVENT_REVEAL_TASK_REWARD_SCHEME] = 'revealTaskRewardScheme'

    this.eventNames[EVENT_UPDATE_TEAM_RANKINGS] = 'updateTeamRankings'

    this.eventNames[EVENT_CREATE_TASK_FILE] = 'createTaskFile'
    this.eventNames[EVENT_DELETE_TASK_FILE] = 'deleteTaskFile'
  }

  getName (type) {
    return this.eventNames[type]
  }
}

module.exports = new EventNameList()

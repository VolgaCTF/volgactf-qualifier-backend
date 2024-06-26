const express = require('express')
const logger = require('./utils/logger')

const apiRouter = require('./routes/api')

const { session, detectScope } = require('./middleware/session')
const { issueToken } = require('./middleware/security')
const { getTeamSafe } = require('./middleware/team')

const _ = require('underscore')
const moment = require('moment')
const identityController = require('./controllers/identity')
const contestController = require('./controllers/contest')
const contestSerializer = require('./serializers/contest')
const countryController = require('./controllers/country')
const countrySerializer = require('./serializers/country')

const teamRankingController = require('./controllers/team-ranking')
const teamRankingSerializer = require('./serializers/team-ranking')

const { contestNotFinished, getContestTitle, getContest } = require('./middleware/contest')
const constraints = require('./utils/constraints')
const teamController = require('./controllers/team')
const Validator = require('validator.js')
const validator = new Validator.Validator()
const { ValidationError, BaseError, CTFtimeProfileEmailMismatchError, CTFtimeProfileTeamMismatchError, CTFtimeProfileAlreadyLinkedError, ContestFinishedError } = require('./utils/errors')

const teamSerializer = require('./serializers/team')

const { getGeoIPData } = require('./middleware/geoip')

const postController = require('./controllers/post')
const postSerializer = require('./serializers/post')
const MarkdownRenderer = require('./utils/markdown')

const categoryController = require('./controllers/category')
const categorySerializer = require('./serializers/category')

const taskController = require('./controllers/task')
const taskSerializer = require('./serializers/task')

const taskCategoryController = require('./controllers/task-category')
const taskCategorySerializer = require('./serializers/task-category')

const teamTaskHitController = require('./controllers/team-task-hit')
const teamTaskHitSerializer = require('./serializers/team-task-hit')

const teamParam = require('./params/team')

const remoteCheckerController = require('./controllers/remote-checker')
const remoteCheckerSerializer = require('./serializers/remote-checker')

const taskRemoteCheckerController = require('./controllers/task-remote-checker')
const taskRemoteCheckerSerializer = require('./serializers/task-remote-checker')

const teamTaskReviewController = require('./controllers/team-task-review')
const teamTaskReviewSerializer = require('./serializers/team-task-review')

const taskHintController = require('./controllers/task-hint')
const taskHintSerializer = require('./serializers/task-hint')

const taskValueController = require('./controllers/task-value')
const taskValueSerializer = require('./serializers/task-value')

const taskRewardSchemeController = require('./controllers/task-reward-scheme')
const taskRewardSchemeSerializer = require('./serializers/task-reward-scheme')

const supervisorTaskSubscriptionController = require('./controllers/supervisor-task-subscription')
const supervisorTaskSubscriptionSerializer = require('./serializers/supervisor-task-subscription')

const taskParam = require('./params/task')

const ctftimeOAuthController = require('./controllers/ctftime-oauth')
const emailAddressValidator = require('./controllers/email-address-validator')
const { SCOPE_TEAM } = require('./utils/constants')
const EventController = require('./controllers/event')
const LoginTeamEvent = require('./events/login-team')
const LinkTeamCTFtimeEvent = require('./events/link-team-ctftime')

const jsesc = require('jsesc')

const templateStore = require('./utils/template-store')
const {
  TEMPLATE_INDEX_PAGE, TEMPLATE_NEWS_PAGE, TEMPLATE_TEAMS_PAGE, TEMPLATE_CATEGORIES_PAGE, TEMPLATE_TEAM_PROFILE_PAGE,
  TEMPLATE_SCOREBOARD_PAGE, TEMPLATE_TASKS_PAGE, TEMPLATE_TASK_STATISTICS_PAGE, TEMPLATE_ABOUT_PAGE, TEMPLATE_CONTEST_PAGE,
  TEMPLATE_REMOTE_CHECKERS_PAGE, TEMPLATE_SUPERVISOR_SIGNIN_PAGE, TEMPLATE_TEAM_SIGNIN_PAGE, TEMPLATE_TEAM_RESTORE_PAGE,
  TEMPLATE_TEAM_CTFTIME_OAUTH_START_PAGE, TEMPLATE_TEAM_CTFTIME_OAUTH_COMPLETE_PAGE,
  TEMPLATE_TEAM_SIGNUP_PAGE, TEMPLATE_TEAM_VERIFY_EMAIL_PAGE, TEMPLATE_TEAM_RESET_PASSWORD_PAGE,
  TEMPLATE_SUPERVISORS_PAGE, TEMPLATE_SUPERVISOR_CREATE_PAGE,
  TEMPLATE_404_PAGE, TEMPLATE_500_PAGE, TEMPLATE_ROBOTS_PAGE,
  TEMPLATE_ANALYTICS, TEMPLATE_NAVBAR, TEMPLATE_STREAM_STATE_PARTIAL,
  TEMPLATE_CONTEST_STATE_PARTIAL, TEMPLATE_INDEX_VIEW,
  TEMPLATE_TEAM_LIST, TEMPLATE_TEAM_CARD, TEMPLATE_POST_LIST,
  TEMPLATE_POST_PARTIAL, TEMPLATE_POST_SIMPLIFIED_PARTIAL, TEMPLATE_CATEGORY_LIST, TEMPLATE_CATEGORY_PARTIAL,
  TEMPLATE_TEAM_PROFILE_PARTIAL, TEMPLATE_SCOREBOARD_TABLE, TEMPLATE_SCOREBOARD_TABLE_ROW_PARTIAL, TEMPLATE_TASK_CONTENT_PARTIAL,
  TEMPLATE_CREATE_TASK_HINT_TEXTAREA_PARTIAL, TEMPLATE_CREATE_TASK_ANSWER_INPUT_PARTIAL,
  TEMPLATE_CREATE_TASK_REWARD_SCHEME_PARTIAL, TEMPLATE_CREATE_TASK_CHECK_METHOD_PARTIAL,
  TEMPLATE_EDIT_TASK_HINT_TEXTAREA_PARTIAL, TEMPLATE_EDIT_TASK_ANSWER_INPUT_PARTIAL,
  TEMPLATE_EDIT_TASK_REWARD_SCHEME_PARTIAL, TEMPLATE_EDIT_TASK_CHECK_METHOD_PARTIAL,
  TEMPLATE_TASK_LIST, TEMPLATE_TASK_CARD,
  TEMPLATE_REVISE_TASK_STATUS_PARTIAL, TEMPLATE_SUBMIT_TASK_STATUS_PARTIAL, TEMPLATE_REMOTE_CHECKER_LIST,
  TEMPLATE_REMOTE_CHECKER_BLOCK, TEMPLATE_TASK_FILE_LIST, TEMPLATE_TASK_FILE_PARTIAL,
  TEMPLATE_TASK_FILE_LIST_COMPACT, TEMPLATE_TASK_FILE_PARTIAL_COMPACT,
  TEMPLATE_EVENT_LIVE_PAGE, TEMPLATE_EVENT_HISTORY_PAGE, TEMPLATE_EVENT_HISTORY_PAGINATION_PARTIAL,
  TEMPLATE_EVENT_LOG_UNKNOWN, TEMPLATE_EVENT_LOG_UPDATE_CONTEST,
  TEMPLATE_EVENT_LOG_CREATE_CATEGORY, TEMPLATE_EVENT_LOG_UPDATE_CATEGORY, TEMPLATE_EVENT_LOG_DELETE_CATEGORY,
  TEMPLATE_EVENT_LOG_CREATE_POST, TEMPLATE_EVENT_LOG_UPDATE_POST, TEMPLATE_EVENT_LOG_DELETE_POST,
  TEMPLATE_EVENT_LOG_CREATE_SUPERVISOR, TEMPLATE_EVENT_LOG_DELETE_SUPERVISOR,
  TEMPLATE_EVENT_LOG_UPDATE_SUPERVISOR_PASSWORD, TEMPLATE_EVENT_LOG_LOGIN_SUPERVISOR,
  TEMPLATE_EVENT_LOG_LOGOUT_SUPERVISOR, TEMPLATE_EVENT_LOG_CREATE_REMOTE_CHECKER,
  TEMPLATE_EVENT_LOG_UPDATE_REMOTE_CHECKER, TEMPLATE_EVENT_LOG_DELETE_REMOTE_CHECKER,
  TEMPLATE_EVENT_LOG_CREATE_TEAM, TEMPLATE_EVENT_LOG_UPDATE_TEAM_EMAIL, TEMPLATE_EVENT_LOG_UPDATE_TEAM_PROFILE,
  TEMPLATE_EVENT_LOG_UPDATE_TEAM_PASSWORD, TEMPLATE_EVENT_LOG_UPDATE_TEAM_LOGO, TEMPLATE_EVENT_LOG_QUALIFY_TEAM,
  TEMPLATE_EVENT_LOG_DISQUALIFY_TEAM, TEMPLATE_EVENT_LOG_LOGIN_TEAM, TEMPLATE_EVENT_LOG_LOGOUT_TEAM,
  TEMPLATE_EVENT_LOG_LINK_TEAM_CTFTIME, TEMPLATE_EVENT_LOG_CREATE_TASK, TEMPLATE_EVENT_LOG_UPDATE_TASK,
  TEMPLATE_EVENT_LOG_OPEN_TASK, TEMPLATE_EVENT_LOG_CLOSE_TASK, TEMPLATE_EVENT_LOG_CREATE_TASK_CATEGORY,
  TEMPLATE_EVENT_LOG_DELETE_TASK_CATEGORY, TEMPLATE_EVENT_LOG_CREATE_TASK_VALUE,
  TEMPLATE_EVENT_LOG_UPDATE_TASK_VALUE, TEMPLATE_EVENT_LOG_CREATE_TASK_REWARD_SCHEME,
  TEMPLATE_EVENT_LOG_UPDATE_TASK_REWARD_SCHEME, TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_HIT_ATTEMPT,
  TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_HIT, TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_REVIEW,
  TEMPLATE_EVENT_LOG_CREATE_TASK_FILE, TEMPLATE_EVENT_LOG_DELETE_TASK_FILE
} = require('./constants/template')

const { TASK_MIN_VALUE, TASK_MAX_VALUE } = require('./utils/constants')

const app = express()
app.set('x-powered-by', false)
app.set('trust proxy', true)

app.use(session)

app.use('/api', apiRouter)

const googleTagId = (process.env.GOOGLE_TAG_ID && process.env.GOOGLE_TAG_ID !== '') ? process.env.GOOGLE_TAG_ID : null

function voidPromise () {
  return new Promise(function (resolve, reject) {
    resolve(null)
  })
}

templateStore.register(TEMPLATE_INDEX_PAGE, 'html/index.html')
templateStore.register(TEMPLATE_TEAMS_PAGE, 'html/teams.html')
templateStore.register(TEMPLATE_NEWS_PAGE, 'html/news.html')
templateStore.register(TEMPLATE_CATEGORIES_PAGE, 'html/categories.html')
templateStore.register(TEMPLATE_TEAM_PROFILE_PAGE, 'html/team/profile.html')
templateStore.register(TEMPLATE_SCOREBOARD_PAGE, 'html/scoreboard.html')
templateStore.register(TEMPLATE_TASKS_PAGE, 'html/tasks.html')
templateStore.register(TEMPLATE_TASK_STATISTICS_PAGE, 'html/task/statistics.html')
templateStore.register(TEMPLATE_ABOUT_PAGE, 'html/about.html')
templateStore.register(TEMPLATE_CONTEST_PAGE, 'html/contest.html')
templateStore.register(TEMPLATE_REMOTE_CHECKERS_PAGE, 'html/remote_checkers.html')
templateStore.register(TEMPLATE_EVENT_LIVE_PAGE, 'html/event/live.html')
templateStore.register(TEMPLATE_EVENT_HISTORY_PAGE, 'html/event/history.html')
templateStore.register(TEMPLATE_SUPERVISOR_SIGNIN_PAGE, 'html/supervisor/signin.html')
templateStore.register(TEMPLATE_TEAM_SIGNIN_PAGE, 'html/team/signin.html')
if (ctftimeOAuthController.isEnabled()) {
  templateStore.register(TEMPLATE_TEAM_CTFTIME_OAUTH_START_PAGE, 'html/team/ctftime/oauth/start.html')
  templateStore.register(TEMPLATE_TEAM_CTFTIME_OAUTH_COMPLETE_PAGE, 'html/team/ctftime/oauth/complete.html')
}
templateStore.register(TEMPLATE_TEAM_RESTORE_PAGE, 'html/team/restore.html')
templateStore.register(TEMPLATE_TEAM_SIGNUP_PAGE, 'html/team/signup.html')
templateStore.register(TEMPLATE_TEAM_VERIFY_EMAIL_PAGE, 'html/team/verify-email.html')
templateStore.register(TEMPLATE_TEAM_RESET_PASSWORD_PAGE, 'html/team/reset-password.html')
templateStore.register(TEMPLATE_SUPERVISORS_PAGE, 'html/supervisors.html')
templateStore.register(TEMPLATE_SUPERVISOR_CREATE_PAGE, 'html/supervisor/create.html')
templateStore.register(TEMPLATE_404_PAGE, 'html/404.html')
templateStore.register(TEMPLATE_500_PAGE, 'html/500.html')
templateStore.register(TEMPLATE_ROBOTS_PAGE, 'html/robots.html')

templateStore.register(TEMPLATE_ANALYTICS, 'html/analytics.html')

templateStore.register(TEMPLATE_NAVBAR, 'html/navbar-view.html')
templateStore.register(TEMPLATE_STREAM_STATE_PARTIAL, 'html/stream-state-partial.html')

templateStore.register(TEMPLATE_CONTEST_STATE_PARTIAL, 'html/contest-state-partial.html')

templateStore.register(TEMPLATE_INDEX_VIEW, 'html/index-view.html')

templateStore.register(TEMPLATE_TEAM_LIST, 'html/team-list.html')
templateStore.register(TEMPLATE_TEAM_CARD, 'html/team-card.html')

templateStore.register(TEMPLATE_POST_LIST, 'html/post-list.html')
templateStore.register(TEMPLATE_POST_PARTIAL, 'html/post-partial.html')
templateStore.register(TEMPLATE_POST_SIMPLIFIED_PARTIAL, 'html/post-simplified-partial.html')

templateStore.register(TEMPLATE_CATEGORY_LIST, 'html/category-list.html')
templateStore.register(TEMPLATE_CATEGORY_PARTIAL, 'html/category-partial.html')

templateStore.register(TEMPLATE_TEAM_PROFILE_PARTIAL, 'html/team-profile-partial.html')

templateStore.register(TEMPLATE_SCOREBOARD_TABLE, 'html/scoreboard-table.html')
templateStore.register(TEMPLATE_SCOREBOARD_TABLE_ROW_PARTIAL, 'html/scoreboard-table-row-partial.html')

templateStore.register(TEMPLATE_TASK_CONTENT_PARTIAL, 'html/task-content-partial.html')
templateStore.register(TEMPLATE_CREATE_TASK_HINT_TEXTAREA_PARTIAL, 'html/create-task-hint-textarea-partial.html')
templateStore.register(TEMPLATE_CREATE_TASK_ANSWER_INPUT_PARTIAL, 'html/create-task-answer-input-partial.html')
templateStore.register(TEMPLATE_CREATE_TASK_REWARD_SCHEME_PARTIAL, 'html/create-task-reward-scheme-partial.html')
templateStore.register(TEMPLATE_CREATE_TASK_CHECK_METHOD_PARTIAL, 'html/create-task-check-method-partial.html')
templateStore.register(TEMPLATE_EDIT_TASK_HINT_TEXTAREA_PARTIAL, 'html/edit-task-hint-textarea-partial.html')
templateStore.register(TEMPLATE_EDIT_TASK_ANSWER_INPUT_PARTIAL, 'html/edit-task-answer-input-partial.html')
templateStore.register(TEMPLATE_EDIT_TASK_REWARD_SCHEME_PARTIAL, 'html/edit-task-reward-scheme-partial.html')
templateStore.register(TEMPLATE_EDIT_TASK_CHECK_METHOD_PARTIAL, 'html/edit-task-check-method-partial.html')
templateStore.register(TEMPLATE_TASK_LIST, 'html/task-list.html')
templateStore.register(TEMPLATE_TASK_CARD, 'html/task-card.html')
templateStore.register(TEMPLATE_REVISE_TASK_STATUS_PARTIAL, 'html/revise-task-status-partial.html')
templateStore.register(TEMPLATE_SUBMIT_TASK_STATUS_PARTIAL, 'html/submit-task-status-partial.html')
templateStore.register(TEMPLATE_TASK_FILE_LIST, 'html/task-file-list.html')
templateStore.register(TEMPLATE_TASK_FILE_PARTIAL, 'html/task-file-partial.html')
templateStore.register(TEMPLATE_TASK_FILE_LIST_COMPACT, 'html/task-file-list-compact.html')
templateStore.register(TEMPLATE_TASK_FILE_PARTIAL_COMPACT, 'html/task-file-partial-compact.html')
templateStore.register(TEMPLATE_REMOTE_CHECKER_LIST, 'html/remote-checker-list.html')
templateStore.register(TEMPLATE_REMOTE_CHECKER_BLOCK, 'html/remote-checker-block.html')

templateStore.register(TEMPLATE_EVENT_LOG_UNKNOWN, 'html/event/unknown.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_CONTEST, 'html/event/update-contest.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_CATEGORY, 'html/event/create-category.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_CATEGORY, 'html/event/update-category.html')
templateStore.register(TEMPLATE_EVENT_LOG_DELETE_CATEGORY, 'html/event/delete-category.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_POST, 'html/event/create-post.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_POST, 'html/event/update-post.html')
templateStore.register(TEMPLATE_EVENT_LOG_DELETE_POST, 'html/event/delete-post.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_SUPERVISOR, 'html/event/create-supervisor.html')
templateStore.register(TEMPLATE_EVENT_LOG_DELETE_SUPERVISOR, 'html/event/delete-supervisor.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_SUPERVISOR_PASSWORD, 'html/event/update-supervisor-password.html')
templateStore.register(TEMPLATE_EVENT_LOG_LOGIN_SUPERVISOR, 'html/event/login-supervisor.html')
templateStore.register(TEMPLATE_EVENT_LOG_LOGOUT_SUPERVISOR, 'html/event/logout-supervisor.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_REMOTE_CHECKER, 'html/event/create-remote-checker.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_REMOTE_CHECKER, 'html/event/update-remote-checker.html')
templateStore.register(TEMPLATE_EVENT_LOG_DELETE_REMOTE_CHECKER, 'html/event/delete-remote-checker.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_TEAM, 'html/event/create-team.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_TEAM_EMAIL, 'html/event/update-team-email.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_TEAM_PROFILE, 'html/event/update-team-profile.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_TEAM_PASSWORD, 'html/event/update-team-password.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_TEAM_LOGO, 'html/event/update-team-logo.html')
templateStore.register(TEMPLATE_EVENT_LOG_QUALIFY_TEAM, 'html/event/qualify-team.html')
templateStore.register(TEMPLATE_EVENT_LOG_DISQUALIFY_TEAM, 'html/event/disqualify-team.html')
templateStore.register(TEMPLATE_EVENT_LOG_LOGIN_TEAM, 'html/event/login-team.html')
templateStore.register(TEMPLATE_EVENT_LOG_LOGOUT_TEAM, 'html/event/logout-team.html')
templateStore.register(TEMPLATE_EVENT_LOG_LINK_TEAM_CTFTIME, 'html/event/link-team-ctftime.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_TASK, 'html/event/create-task.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_TASK, 'html/event/update-task.html')
templateStore.register(TEMPLATE_EVENT_LOG_OPEN_TASK, 'html/event/open-task.html')
templateStore.register(TEMPLATE_EVENT_LOG_CLOSE_TASK, 'html/event/close-task.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_TASK_CATEGORY, 'html/event/create-task-category.html')
templateStore.register(TEMPLATE_EVENT_LOG_DELETE_TASK_CATEGORY, 'html/event/delete-task-category.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_TASK_VALUE, 'html/event/create-task-value.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_TASK_VALUE, 'html/event/update-task-value.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_TASK_REWARD_SCHEME, 'html/event/create-task-reward-scheme.html')
templateStore.register(TEMPLATE_EVENT_LOG_UPDATE_TASK_REWARD_SCHEME, 'html/event/update-task-reward-scheme.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_HIT_ATTEMPT, 'html/event/create-team-task-hit-attempt.html')
templateStore.register(TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_HIT, 'html/event/create-team-task-hit.html')
templateStore.register(TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_REVIEW, 'html/event/create-team-task-review.html')

templateStore.register(TEMPLATE_EVENT_LOG_CREATE_TASK_FILE, 'html/event/create-task-file.html')
templateStore.register(TEMPLATE_EVENT_LOG_DELETE_TASK_FILE, 'html/event/delete-task-file.html')

templateStore.register(TEMPLATE_EVENT_HISTORY_PAGINATION_PARTIAL, 'html/event/pagination.html')

app.get('/', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_INDEX_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_INDEX_VIEW
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_INDEX_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_INDEX_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/teams', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TEAMS_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_TEAM_LIST,
      TEMPLATE_TEAM_CARD
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    countryController.fetch(),
    teamController.fetch(!request.scope.isSupervisor())
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const countries = _.map(values[3], countrySerializer)
      const teams = _.map(values[4], _.partial(teamSerializer, _, { exposeEmail: request.scope.isSupervisor() }))
      const pageTemplate = templates[TEMPLATE_TEAMS_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        countries,
        teams,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_TEAMS_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/news', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_NEWS_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_POST_LIST,
      TEMPLATE_POST_PARTIAL,
      TEMPLATE_POST_SIMPLIFIED_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    postController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const posts = _.map(values[3], postSerializer)
      const pageTemplate = templates[TEMPLATE_NEWS_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        md: new MarkdownRenderer(),
        identity,
        contest,
        contestTitle: request.contestTitle,
        posts,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_NEWS_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/categories', detectScope, issueToken, getContestTitle, function (request, response, next) {
  if (request.scope.isTeam() || request.scope.isGuest()) {
    next()
    return
  }

  const promises = [
    templateStore.resolveAll([
      TEMPLATE_CATEGORIES_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CATEGORY_LIST,
      TEMPLATE_CATEGORY_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    categoryController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const categories = _.map(values[3], categorySerializer)
      const pageTemplate = templates[TEMPLATE_CATEGORIES_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        categories,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_CATEGORIES_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.param('teamId', teamParam.id)

app.get('/team/:teamId/profile', detectScope, issueToken, getGeoIPData, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TEAM_PROFILE_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_TEAM_PROFILE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    teamController.fetchOne(request.teamId),
    countryController.fetch()
  ]

  if (request.scope.isSupervisor() || (request.scope.isTeam() && request.session.identityID === request.teamId)) {
    promises.push(taskController.fetch(false))
    promises.push(taskValueController.fetch(false))
    promises.push(teamTaskHitController.fetchForTeam(request.teamId))
    promises.push(teamTaskReviewController.fetchByTeam(request.teamId))
  } else {
    promises.push(voidPromise())
    promises.push(voidPromise())
    promises.push(teamTaskHitController.fetchForTeam(request.teamId))
    promises.push(teamTaskReviewController.fetchByTeam(request.teamId))
  }

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const exposeSensitiveData = request.scope.isSupervisor() || (request.scope.isTeam() && request.session.identityID === values[3].id)
      const team = teamSerializer(values[3], { exposeEmail: exposeSensitiveData, exposePasswordAvailability: exposeSensitiveData })
      const countries = _.map(values[4], countrySerializer)

      let tasks = []
      let taskValues = []
      let teamTaskHits = []
      let teamTaskHitStatistics = null
      let teamTaskReviews = []
      let teamTaskReviewStatistics = null
      if (request.scope.isSupervisor() || (request.scope.isTeam() && request.session.identityID === request.teamId)) {
        tasks = _.map(values[5], _.partial(taskSerializer, _, { preview: true }))
        taskValues = _.map(values[6], taskValueSerializer)
        teamTaskHits = _.map(values[7], teamTaskHitSerializer)
        teamTaskReviews = _.map(values[8], teamTaskReviewSerializer)
      } else {
        teamTaskHitStatistics = {
          count: values[7].length
        }
        teamTaskReviewStatistics = {
          count: values[8].length,
          averageRating: _.reduce(values[8], function (sum, review) {
            return sum + review.rating
          }, 0) / (values[8].length === 0 ? 1 : values[8].length)
        }
      }

      const pageTemplate = templates[TEMPLATE_TEAM_PROFILE_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        team,
        countries,
        tasks,
        taskValues,
        teamTaskHits,
        teamTaskHitStatistics,
        teamTaskReviews,
        teamTaskReviewStatistics,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_TEAM_PROFILE_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/scoreboard', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_SCOREBOARD_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_SCOREBOARD_TABLE,
      TEMPLATE_SCOREBOARD_TABLE_ROW_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    countryController.fetch(),
    teamController.fetch(!request.scope.isSupervisor()),
    teamRankingController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const countries = _.map(values[3], countrySerializer)
      const teams = _.map(values[4], _.partial(teamSerializer, _, { exposeEmail: request.scope.isSupervisor() }))
      const teamRankings = _.map(values[5], teamRankingSerializer)
      const pageTemplate = templates[TEMPLATE_SCOREBOARD_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        countries,
        teams,
        teamRankings,
        detailed: Object.hasOwn(request.query, 'detailed'),
        printLayout: Object.hasOwn(request.query, 'printLayout'),
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_SCOREBOARD_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

const scoringDynlog = {
  min: parseInt(process.env.VOLGACTF_QUALIFIER_SCORING_DYNLOG_MIN, 10),
  max: parseInt(process.env.VOLGACTF_QUALIFIER_SCORING_DYNLOG_MAX, 10),
  k: parseFloat(process.env.VOLGACTF_QUALIFIER_SCORING_DYNLOG_K).toFixed(4),
  v: parseFloat(process.env.VOLGACTF_QUALIFIER_SCORING_DYNLOG_V).toFixed(4)
}

app.get('/tasks', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TASKS_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_TASK_CONTENT_PARTIAL,
      TEMPLATE_CREATE_TASK_HINT_TEXTAREA_PARTIAL,
      TEMPLATE_CREATE_TASK_ANSWER_INPUT_PARTIAL,
      TEMPLATE_CREATE_TASK_REWARD_SCHEME_PARTIAL,
      TEMPLATE_CREATE_TASK_CHECK_METHOD_PARTIAL,
      TEMPLATE_EDIT_TASK_HINT_TEXTAREA_PARTIAL,
      TEMPLATE_EDIT_TASK_ANSWER_INPUT_PARTIAL,
      TEMPLATE_EDIT_TASK_REWARD_SCHEME_PARTIAL,
      TEMPLATE_EDIT_TASK_CHECK_METHOD_PARTIAL,
      TEMPLATE_TASK_LIST,
      TEMPLATE_TASK_CARD,
      TEMPLATE_REVISE_TASK_STATUS_PARTIAL,
      TEMPLATE_SUBMIT_TASK_STATUS_PARTIAL,
      TEMPLATE_TASK_FILE_LIST,
      TEMPLATE_TASK_FILE_PARTIAL,
      TEMPLATE_TASK_FILE_LIST_COMPACT,
      TEMPLATE_TASK_FILE_PARTIAL_COMPACT
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    categoryController.fetch(),
    taskController.fetch(request.scope.isSupervisor()),
    taskCategoryController.fetch(request.scope.isSupervisor()),
    taskValueController.fetch(request.scope.isSupervisor()),
    taskRewardSchemeController.fetch(request.scope.isSupervisor())
  ]

  if (request.scope.isTeam()) {
    promises.push(teamTaskHitController.fetchForTeam(request.session.identityID))
  }

  if (request.scope.isSupervisor()) {
    promises.push(supervisorTaskSubscriptionController.fetchForSupervisor(request.session.identityID))
  }

  if (request.scope.isAdmin()) {
    promises.push(remoteCheckerController.fetch())
    promises.push(taskRemoteCheckerController.fetch())
  }

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const categories = _.map(values[3], categorySerializer)
      const taskPreviews = _.map(values[4], _.partial(taskSerializer, _, { preview: true }))
      const taskCategories = _.map(values[5], taskCategorySerializer)
      const taskValues = _.map(values[6], taskValueSerializer)
      const taskRewardSchemes = _.map(values[7], _.partial(taskRewardSchemeSerializer, _, { exposeDynlog: request.scope.isSupervisor() }))

      let teamTaskHits = []
      if (request.scope.isTeam()) {
        teamTaskHits = _.map(values[8], teamTaskHitSerializer)
      }

      let supervisorTaskSubscriptions = []
      if (request.scope.isSupervisor()) {
        supervisorTaskSubscriptions = _.map(values[8], supervisorTaskSubscriptionSerializer)
      }

      let remoteCheckers = []
      let taskRemoteCheckers = []
      if (request.scope.isAdmin()) {
        remoteCheckers = _.map(values[9], remoteCheckerSerializer)
        taskRemoteCheckers = _.map(values[10], taskRemoteCheckerSerializer)
      }
      const pageTemplate = templates[TEMPLATE_TASKS_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        categories,
        taskPreviews,
        taskCategories,
        taskValues,
        taskRewardSchemes,
        teamTaskHits,
        supervisorTaskSubscriptions,
        remoteCheckers,
        taskRemoteCheckers,
        google_tag_id: googleTagId,
        taskMinValue: TASK_MIN_VALUE,
        taskMaxValue: TASK_MAX_VALUE,
        scoringDynlog,
        templates: _.omit(templates, TEMPLATE_TASKS_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.param('taskId', taskParam.id)

app.get('/task/:taskId/statistics', detectScope, issueToken, getContestTitle, function (request, response, next) {
  if (request.scope.isTeam() || request.scope.isGuest()) {
    next()
    return
  }

  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TASK_STATISTICS_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    teamController.fetch(false),
    taskController.fetchOne(request.taskId),
    taskHintController.fetchByTask(request.taskId),
    teamTaskHitController.fetchByTask(request.taskId),
    teamTaskReviewController.fetchByTask(request.taskId)
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const teams = _.map(values[3], _.partial(teamSerializer, _, { exposeEmail: true }))
      const task = taskSerializer(values[4])
      const taskHints = _.map(values[5], taskHintSerializer)
      const teamTaskHits = _.map(values[6], teamTaskHitSerializer)
      const teamTaskReviews = _.map(values[7], teamTaskReviewSerializer)
      const pageTemplate = templates[TEMPLATE_TASK_STATISTICS_PAGE]
      response.send(pageTemplate({
        _,
        md: new MarkdownRenderer(),
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        teams,
        task,
        taskHints,
        teamTaskHits,
        teamTaskReviews,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_TASK_STATISTICS_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/about', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_ABOUT_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_ABOUT_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_ABOUT_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/contest', detectScope, issueToken, getContestTitle, function (request, response, next) {
  if (request.scope.isTeam() || request.scope.isGuest()) {
    next()
    return
  }

  const promises = [
    templateStore.resolveAll([
      TEMPLATE_CONTEST_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_CONTEST_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_CONTEST_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/supervisors', detectScope, issueToken, getContestTitle, function (request, response, next) {
  if (!request.scope.isAdmin()) {
    next()
    return
  }

  const promises = [
    templateStore.resolveAll([
      TEMPLATE_SUPERVISORS_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_SUPERVISORS_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_SUPERVISORS_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/remote_checkers', detectScope, issueToken, getContestTitle, function (request, response, next) {
  if (request.scope.isTeam() || request.scope.isGuest()) {
    next()
    return
  }

  const promises = [
    templateStore.resolveAll([
      TEMPLATE_REMOTE_CHECKERS_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_REMOTE_CHECKER_LIST,
      TEMPLATE_REMOTE_CHECKER_BLOCK
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    remoteCheckerController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const remoteCheckers = _.map(values[3], remoteCheckerSerializer)
      const pageTemplate = templates[TEMPLATE_REMOTE_CHECKERS_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        contestTitle: request.contestTitle,
        remoteCheckers,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_REMOTE_CHECKERS_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/event/live', detectScope, issueToken, getContestTitle, function (request, response, next) {
  if (request.scope.isTeam() || request.scope.isGuest()) {
    next()
    return
  }

  const promises = [
    templateStore.resolveAll([
      TEMPLATE_EVENT_LIVE_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_EVENT_LOG_UNKNOWN,
      TEMPLATE_EVENT_LOG_UPDATE_CONTEST,
      TEMPLATE_EVENT_LOG_CREATE_CATEGORY,
      TEMPLATE_EVENT_LOG_UPDATE_CATEGORY,
      TEMPLATE_EVENT_LOG_DELETE_CATEGORY,
      TEMPLATE_EVENT_LOG_CREATE_POST,
      TEMPLATE_EVENT_LOG_UPDATE_POST,
      TEMPLATE_EVENT_LOG_DELETE_POST,
      TEMPLATE_EVENT_LOG_CREATE_SUPERVISOR,
      TEMPLATE_EVENT_LOG_DELETE_SUPERVISOR,
      TEMPLATE_EVENT_LOG_UPDATE_SUPERVISOR_PASSWORD,
      TEMPLATE_EVENT_LOG_LOGIN_SUPERVISOR,
      TEMPLATE_EVENT_LOG_LOGOUT_SUPERVISOR,
      TEMPLATE_EVENT_LOG_CREATE_REMOTE_CHECKER,
      TEMPLATE_EVENT_LOG_UPDATE_REMOTE_CHECKER,
      TEMPLATE_EVENT_LOG_DELETE_REMOTE_CHECKER,
      TEMPLATE_EVENT_LOG_CREATE_TEAM,
      TEMPLATE_EVENT_LOG_UPDATE_TEAM_EMAIL,
      TEMPLATE_EVENT_LOG_UPDATE_TEAM_PROFILE,
      TEMPLATE_EVENT_LOG_UPDATE_TEAM_PASSWORD,
      TEMPLATE_EVENT_LOG_UPDATE_TEAM_LOGO,
      TEMPLATE_EVENT_LOG_QUALIFY_TEAM,
      TEMPLATE_EVENT_LOG_DISQUALIFY_TEAM,
      TEMPLATE_EVENT_LOG_LOGIN_TEAM,
      TEMPLATE_EVENT_LOG_LOGOUT_TEAM,
      TEMPLATE_EVENT_LOG_LINK_TEAM_CTFTIME,
      TEMPLATE_EVENT_LOG_CREATE_TASK,
      TEMPLATE_EVENT_LOG_UPDATE_TASK,
      TEMPLATE_EVENT_LOG_OPEN_TASK,
      TEMPLATE_EVENT_LOG_CLOSE_TASK,
      TEMPLATE_EVENT_LOG_CREATE_TASK_CATEGORY,
      TEMPLATE_EVENT_LOG_DELETE_TASK_CATEGORY,
      TEMPLATE_EVENT_LOG_CREATE_TASK_VALUE,
      TEMPLATE_EVENT_LOG_UPDATE_TASK_VALUE,
      TEMPLATE_EVENT_LOG_CREATE_TASK_REWARD_SCHEME,
      TEMPLATE_EVENT_LOG_UPDATE_TASK_REWARD_SCHEME,
      TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_HIT_ATTEMPT,
      TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_HIT,
      TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_REVIEW,
      TEMPLATE_EVENT_LOG_CREATE_TASK_FILE,
      TEMPLATE_EVENT_LOG_DELETE_TASK_FILE
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    categoryController.fetch(),
    postController.fetch(),
    taskController.fetch(true),
    taskCategoryController.fetch(true),
    taskValueController.fetch(true),
    taskRewardSchemeController.fetch(true),
    teamController.fetch(false),
    remoteCheckerController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const categories = _.map(values[3], categorySerializer)
      const posts = _.map(values[4], postSerializer)
      const taskPreviews = _.map(values[5], _.partial(taskSerializer, _, { preview: true }))
      const taskCategories = _.map(values[6], taskCategorySerializer)
      const taskValues = _.map(values[7], taskValueSerializer)
      const taskRewardSchemes = _.map(values[8], _.partial(taskRewardSchemeSerializer, _, { exposeDynlog: true }))
      const teams = _.map(values[9], _.partial(teamSerializer, _, { exposeEmail: true }))
      const remoteCheckers = _.map(values[10], remoteCheckerSerializer)

      const pageTemplate = templates[TEMPLATE_EVENT_LIVE_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        categories,
        posts,
        taskPreviews,
        taskCategories,
        taskValues,
        taskRewardSchemes,
        teams,
        remoteCheckers,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_EVENT_LIVE_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/event/history', detectScope, issueToken, getContestTitle, function (request, response, next) {
  if (request.scope.isTeam() || request.scope.isGuest()) {
    next()
    return
  }

  const promises = [
    templateStore.resolveAll([
      TEMPLATE_EVENT_HISTORY_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_EVENT_LOG_UNKNOWN,
      TEMPLATE_EVENT_LOG_UPDATE_CONTEST,
      TEMPLATE_EVENT_LOG_CREATE_CATEGORY,
      TEMPLATE_EVENT_LOG_UPDATE_CATEGORY,
      TEMPLATE_EVENT_LOG_DELETE_CATEGORY,
      TEMPLATE_EVENT_LOG_CREATE_POST,
      TEMPLATE_EVENT_LOG_UPDATE_POST,
      TEMPLATE_EVENT_LOG_DELETE_POST,
      TEMPLATE_EVENT_LOG_CREATE_SUPERVISOR,
      TEMPLATE_EVENT_LOG_DELETE_SUPERVISOR,
      TEMPLATE_EVENT_LOG_UPDATE_SUPERVISOR_PASSWORD,
      TEMPLATE_EVENT_LOG_LOGIN_SUPERVISOR,
      TEMPLATE_EVENT_LOG_LOGOUT_SUPERVISOR,
      TEMPLATE_EVENT_LOG_CREATE_REMOTE_CHECKER,
      TEMPLATE_EVENT_LOG_UPDATE_REMOTE_CHECKER,
      TEMPLATE_EVENT_LOG_DELETE_REMOTE_CHECKER,
      TEMPLATE_EVENT_LOG_CREATE_TEAM,
      TEMPLATE_EVENT_LOG_UPDATE_TEAM_EMAIL,
      TEMPLATE_EVENT_LOG_UPDATE_TEAM_PROFILE,
      TEMPLATE_EVENT_LOG_UPDATE_TEAM_PASSWORD,
      TEMPLATE_EVENT_LOG_UPDATE_TEAM_LOGO,
      TEMPLATE_EVENT_LOG_QUALIFY_TEAM,
      TEMPLATE_EVENT_LOG_DISQUALIFY_TEAM,
      TEMPLATE_EVENT_LOG_LOGIN_TEAM,
      TEMPLATE_EVENT_LOG_LOGOUT_TEAM,
      TEMPLATE_EVENT_LOG_LINK_TEAM_CTFTIME,
      TEMPLATE_EVENT_LOG_CREATE_TASK,
      TEMPLATE_EVENT_LOG_UPDATE_TASK,
      TEMPLATE_EVENT_LOG_OPEN_TASK,
      TEMPLATE_EVENT_LOG_CLOSE_TASK,
      TEMPLATE_EVENT_LOG_CREATE_TASK_CATEGORY,
      TEMPLATE_EVENT_LOG_DELETE_TASK_CATEGORY,
      TEMPLATE_EVENT_LOG_CREATE_TASK_VALUE,
      TEMPLATE_EVENT_LOG_UPDATE_TASK_VALUE,
      TEMPLATE_EVENT_LOG_CREATE_TASK_REWARD_SCHEME,
      TEMPLATE_EVENT_LOG_UPDATE_TASK_REWARD_SCHEME,
      TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_HIT_ATTEMPT,
      TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_HIT,
      TEMPLATE_EVENT_LOG_CREATE_TEAM_TASK_REVIEW,
      TEMPLATE_EVENT_LOG_CREATE_TASK_FILE,
      TEMPLATE_EVENT_LOG_DELETE_TASK_FILE,
      TEMPLATE_EVENT_HISTORY_PAGINATION_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    categoryController.fetch(),
    postController.fetch(),
    taskController.fetch(true),
    taskCategoryController.fetch(true),
    taskValueController.fetch(true),
    taskRewardSchemeController.fetch(true),
    teamController.fetch(false),
    remoteCheckerController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const categories = _.map(values[3], categorySerializer)
      const posts = _.map(values[4], postSerializer)
      const taskPreviews = _.map(values[5], _.partial(taskSerializer, _, { preview: true }))
      const taskCategories = _.map(values[6], taskCategorySerializer)
      const taskValues = _.map(values[7], taskValueSerializer)
      const taskRewardSchemes = _.map(values[8], _.partial(taskRewardSchemeSerializer, _, { exposeDynlog: true }))
      const teams = _.map(values[9], _.partial(teamSerializer, _, { exposeEmail: true }))
      const remoteCheckers = _.map(values[10], remoteCheckerSerializer)

      const pageTemplate = templates[TEMPLATE_EVENT_HISTORY_PAGE]
      response.send(pageTemplate({
        _,
        jsesc,
        moment,
        identity,
        contest,
        categories,
        posts,
        taskPreviews,
        taskCategories,
        taskValues,
        taskRewardSchemes,
        teams,
        remoteCheckers,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_EVENT_HISTORY_PAGE),
        runtimeStorage: {},
        fetchThreshold: (new Date()).getTime()
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/supervisor/signin', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_SUPERVISOR_SIGNIN_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_SUPERVISOR_SIGNIN_PAGE]
      response.send(pageTemplate({
        _,
        moment,
        jsesc,
        identity,
        contest,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_SUPERVISOR_SIGNIN_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/supervisor/create', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_SUPERVISOR_CREATE_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_SUPERVISOR_CREATE_PAGE]
      response.send(pageTemplate({
        _,
        moment,
        jsesc,
        identity,
        contest,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_SUPERVISOR_CREATE_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/team/signin', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TEAM_SIGNIN_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_TEAM_SIGNIN_PAGE]
      response.send(pageTemplate({
        _,
        moment,
        jsesc,
        identity,
        contest,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_TEAM_SIGNIN_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

if (ctftimeOAuthController.isEnabled()) {
  app.get('/team/ctftime/oauth/start', detectScope, issueToken, getContestTitle, getTeamSafe, function (request, response, next) {
    if (request.scope.isGuest() || (request.team && !request.team.ctftimeTeamId)) {
      ctftimeOAuthController.setupState(request)
      response.header('Cache-Control', 'no-cache, must-revalidate, max-age=0')
      response.redirect(ctftimeOAuthController.getRedirectLink(request))
    } else {
      const promises = [
        templateStore.resolveAll([
          TEMPLATE_TEAM_CTFTIME_OAUTH_START_PAGE,
          TEMPLATE_ANALYTICS,
          TEMPLATE_NAVBAR,
          TEMPLATE_STREAM_STATE_PARTIAL,
          TEMPLATE_CONTEST_STATE_PARTIAL
        ]),
        identityController.fetch(request),
        contestController.fetch()
      ]

      Promise
        .all(promises)
        .then(function (values) {
          const templates = values[0]
          const identity = values[1]
          const contest = contestSerializer(values[2])
          const pageTemplate = templates[TEMPLATE_TEAM_CTFTIME_OAUTH_START_PAGE]

          response.header('Cache-Control', 'no-cache, must-revalidate, max-age=0')
          response.send(pageTemplate({
            _,
            moment,
            jsesc,
            identity,
            contest,
            contestTitle: request.contestTitle,
            google_tag_id: googleTagId,
            templates: _.omit(templates, TEMPLATE_TEAM_CTFTIME_OAUTH_START_PAGE),
            runtimeStorage: {}
          }))
        })
        .catch(function (err) {
          logger.error(err)
          next(err)
        })
    }
  })

  function loginWithCTFtime (request) {
    return new Promise(function (resolve, reject) {
      let ctftimeData = null

      ctftimeOAuthController
        .processCallback(request)
        .then(function (data) {
          ctftimeData = data
          return teamController.fetchByCTFtimeTeamId((data.team || { id: -1 }).id)
        })
        .then(function (existingTeam) {
          if (existingTeam) {
            if (!request.team || (request.team && request.team.id === existingTeam.id)) {
              resolve({
                action: 'signin',
                team: existingTeam,
                ctftimeData
              })
            } else {
              reject(new CTFtimeProfileAlreadyLinkedError())
            }
          } else {
            if (request.team && !request.team.ctftimeTeamId) {
              const claimEmail = ctftimeData.email || ''
              const claimTeamName = (ctftimeData.team || { name: '' }).name
              const claimCtftimeTeamId = (ctftimeData.team || { id: -1 }).id

              if (claimEmail.toLowerCase() !== request.team.email.toLowerCase()) {
                reject(new CTFtimeProfileEmailMismatchError())
              } else if (claimTeamName !== request.team.name) {
                reject(new CTFtimeProfileTeamMismatchError())
              } else {
                teamController
                  .updateFromCTFtime(request.team.id, claimCtftimeTeamId)
                  .then(function (existingTeam) {
                    resolve({
                      action: 'nothing',
                      team: existingTeam,
                      ctftimeData
                    })
                  })
                  .catch(function (err3) {
                    reject(err3)
                  })
              }
            } else {
              if (request.contest && request.contest.isFinished()) {
                reject(new ContestFinishedError())
              }

              let teamInfo = null
              countryController
                .findByCodeOrDefault((ctftimeData.team || { country: '' }).country)
                .then(function (country) {
                  const signupConstraints = {
                    team: constraints.team,
                    email: constraints.email,
                    countryId: constraints.countryId,
                    locality: constraints.locality
                  }

                  teamInfo = {
                    team: (ctftimeData.team || { name: '' }).name,
                    email: ctftimeData.email || '',
                    countryId: country.id,
                    locality: '',
                    ctftimeTeamId: (ctftimeData.team || { id: -1 }).id
                  }

                  const validationResult = validator.validate(teamInfo, signupConstraints)
                  if (validationResult === true) {
                    return emailAddressValidator.validate(teamInfo.email, request.ip)
                  } else {
                    throw new ValidationError()
                  }
                })
                .then(function () {
                  return teamController.createFromCTFtime(teamInfo, ctftimeData)
                })
                .then(function (newTeam) {
                  resolve({
                    action: 'signup',
                    team: newTeam,
                    ctftimeData
                  })
                })
                .catch(function (err2) {
                  reject(err2)
                })
            }
          }
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  app.get('/team/ctftime/oauth/complete', detectScope, issueToken, getContestTitle, getTeamSafe, getContest, getGeoIPData, function (request, response, next) {
    const promises = [
      templateStore.resolveAll([
        TEMPLATE_TEAM_CTFTIME_OAUTH_COMPLETE_PAGE,
        TEMPLATE_ANALYTICS,
        TEMPLATE_NAVBAR,
        TEMPLATE_STREAM_STATE_PARTIAL,
        TEMPLATE_CONTEST_STATE_PARTIAL
      ]),
      identityController.fetch(request),
      contestController.fetch()
    ]

    Promise
      .all(promises)
      .then(function (values) {
        const templates = values[0]
        const identity = values[1]
        const contest = contestSerializer(values[2])
        const pageTemplate = templates[TEMPLATE_TEAM_CTFTIME_OAUTH_COMPLETE_PAGE]

        if (request.scope.isGuest() || (request.team && !request.team.ctftimeTeamId)) {
          loginWithCTFtime(request)
            .then(function (result) {
              ctftimeOAuthController.clearState(request)
              response.header('Cache-Control', 'no-cache, must-revalidate, max-age=0')
              if (!request.team) {
                EventController.push(new LoginTeamEvent(
                  result.team,
                  request.geoIPData.countryName,
                  request.geoIPData.cityName,
                  result.ctftimeData
                ))
                request.session.authenticated = true
                request.session.identityID = result.team.id
                request.session.scopeID = SCOPE_TEAM
                response.redirect('/')
              } else {
                EventController.push(new LinkTeamCTFtimeEvent(
                  result.team,
                  result.ctftimeData
                ))
                response.redirect(`/team/${result.team.id}/profile`)
              }
            })
            .catch(function (err) {
              logger.error(err)
              ctftimeOAuthController.clearState(request)
              response.header('Cache-Control', 'no-cache, must-revalidate, max-age=0')
              response.send(pageTemplate({
                _,
                moment,
                jsesc,
                identity,
                contest,
                contestTitle: request.contestTitle,
                google_tag_id: googleTagId,
                templates: _.omit(templates, TEMPLATE_TEAM_CTFTIME_OAUTH_COMPLETE_PAGE),
                runtimeStorage: {},
                errorMsg: err instanceof BaseError ? err.message : 'Internal Server Error'
              }))
            })
        } else {
          response.header('Cache-Control', 'no-cache, must-revalidate, max-age=0')
          response.send(pageTemplate({
            _,
            moment,
            jsesc,
            identity,
            contest,
            contestTitle: request.contestTitle,
            google_tag_id: googleTagId,
            templates: _.omit(templates, TEMPLATE_TEAM_CTFTIME_OAUTH_COMPLETE_PAGE),
            runtimeStorage: {},
            errorMsg: null
          }))
        }
      })
      .catch(function (err) {
        logger.error(err)
        next(err)
      })
  })
}

app.get('/team/restore', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TEAM_RESTORE_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_TEAM_RESTORE_PAGE]
      response.send(pageTemplate({
        _,
        moment,
        jsesc,
        identity,
        contest,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_TEAM_RESTORE_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/team/signup', detectScope, issueToken, getGeoIPData, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TEAM_SIGNUP_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    countryController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const countries = _.map(values[3], countrySerializer)
      const pageTemplate = templates[TEMPLATE_TEAM_SIGNUP_PAGE]
      response.send(pageTemplate({
        _,
        moment,
        jsesc,
        identity,
        contest,
        contestTitle: request.contestTitle,
        countries,
        geoIPData: request.geoIPData,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_TEAM_SIGNUP_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

function verifyPromise (request) {
  return new Promise(function (resolve, reject) {
    const verifyConstraints = {
      team: constraints.base64url,
      code: constraints.base64url
    }

    const validationResult = validator.validate({
      team: request.query.team,
      code: request.query.code
    }, verifyConstraints)
    if (validationResult !== true) {
      reject(new ValidationError())
    } else {
      teamController.verifyEmail(request.query.team, request.query.code, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    }
  })
}

app.get('/team/verify-email', detectScope, issueToken, contestNotFinished, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TEAM_VERIFY_EMAIL_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_TEAM_VERIFY_EMAIL_PAGE]
      verifyPromise(request)
        .then(function () {
          response.send(pageTemplate({
            _,
            moment,
            jsesc,
            identity,
            contest,
            contestTitle: request.contestTitle,
            success: true,
            text: 'Email verified. Thank you!',
            google_tag_id: googleTagId,
            templates: _.omit(templates, TEMPLATE_TEAM_VERIFY_EMAIL_PAGE),
            runtimeStorage: {}
          }))
        })
        .catch(function (err2) {
          response.send(pageTemplate({
            _,
            moment,
            jsesc,
            identity,
            contest,
            contestTitle: request.contestTitle,
            success: false,
            text: err2.message,
            google_tag_id: googleTagId,
            templates: _.omit(templates, TEMPLATE_TEAM_VERIFY_EMAIL_PAGE),
            runtimeStorage: {}
          }))
        })
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/team/reset-password', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TEAM_RESET_PASSWORD_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_TEAM_RESET_PASSWORD_PAGE]
      response.send(pageTemplate({
        _,
        moment,
        jsesc,
        identity,
        contest,
        contestTitle: request.contestTitle,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_TEAM_RESET_PASSWORD_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('/robots.txt', function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_ROBOTS_PAGE
    ])
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const pageTemplate = templates[TEMPLATE_ROBOTS_PAGE]
      response
        .set('content-type', 'text/plain')
        .send(pageTemplate({
          fqdn: process.env.VOLGACTF_QUALIFIER_FQDN,
          secure: (process.env.VOLGACTF_QUALIFIER_SECURE === 'yes')
        }))
    })
    .catch(function (err) {
      logger.error(err)
      next(err)
    })
})

app.get('*', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_404_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_CONTEST_STATE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise
    .all(promises)
    .then(function (values) {
      const templates = values[0]
      const identity = values[1]
      const contest = contestSerializer(values[2])
      const pageTemplate = templates[TEMPLATE_404_PAGE]
      response.status(404).send(pageTemplate({
        _,
        moment,
        jsesc,
        identity,
        contest,
        contestTitle: request.contestTitle,
        urlPath: request.path,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_404_PAGE),
        runtimeStorage: {}
      }))
    })
    .catch(function (err) {
      next(err)
    })
})

app.use(function (err, request, response, next) {
  logger.error(err)

  detectScope(request, response, function () {
    getContestTitle(request, response, function () {
      const promises = [
        templateStore.resolveAll([
          TEMPLATE_500_PAGE,
          TEMPLATE_ANALYTICS,
          TEMPLATE_NAVBAR,
          TEMPLATE_STREAM_STATE_PARTIAL,
          TEMPLATE_CONTEST_STATE_PARTIAL
        ]),
        identityController.fetch(request),
        contestController.fetch()
      ]

      Promise
        .all(promises)
        .then(function (values) {
          const templates = values[0]
          const identity = values[1]
          const contest = contestSerializer(values[2])
          const pageTemplate = templates[TEMPLATE_500_PAGE]
          response.status(500).send(pageTemplate({
            _,
            moment,
            jsesc,
            identity,
            contest,
            contestTitle: request.contestTitle,
            google_tag_id: googleTagId,
            templates: _.omit(templates, TEMPLATE_500_PAGE),
            runtimeStorage: {}
          }))
        })
        .catch(function (err2) {
          logger.error(err2)
          response
            .status(500)
            .json('Internal Server Error')
        })
    })
  })
})

module.exports = app

const express = require('express')
const logger = require('./utils/logger')

const apiRouter = require('./routes/api')

const { session, detectScope } = require('./middleware/session')
const { issueToken } = require('./middleware/security')

const _ = require('underscore')
const moment = require('moment')
const identityController = require('./controllers/identity')
const contestController = require('./controllers/contest')
const contestSerializer = require('./serializers/contest')
const teamScoreController = require('./controllers/team-score')
const teamScoreSerializer = require('./serializers/team-score')
const countryController = require('./controllers/country')
const countrySerializer = require('./serializers/country')

const teamRankingController = require('./controllers/team-ranking')
const teamRankingSerializer = require('./serializers/team-ranking')

const { contestNotFinished, getContestTitle } = require('./middleware/contest')
const constraints = require('./utils/constraints')
const teamController = require('./controllers/team')
const Validator = require('validator.js')
const validator = new Validator.Validator()
const { ValidationError } = require('./utils/errors')

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

const taskParam = require('./params/task')

const jsesc = require('jsesc')

const templateStore = require('./utils/template-store')
const { TEMPLATE_INDEX_PAGE, TEMPLATE_NEWS_PAGE, TEMPLATE_TEAMS_PAGE, TEMPLATE_CATEGORIES_PAGE, TEMPLATE_TEAM_PROFILE_PAGE,
  TEMPLATE_SCOREBOARD_PAGE, TEMPLATE_TASKS_PAGE, TEMPLATE_TASK_STATISTICS_PAGE, TEMPLATE_ABOUT_PAGE, TEMPLATE_CONTEST_PAGE,
  TEMPLATE_REMOTE_CHECKERS_PAGE, TEMPLATE_SUPERVISOR_SIGNIN_PAGE, TEMPLATE_TEAM_SIGNIN_PAGE, TEMPLATE_TEAM_RESTORE_PAGE,
  TEMPLATE_TEAM_SIGNUP_PAGE, TEMPLATE_TEAM_VERIFY_EMAIL_PAGE, TEMPLATE_TEAM_RESET_PASSWORD_PAGE, TEMPLATE_404_PAGE,
  TEMPLATE_500_PAGE, TEMPLATE_ROBOTS_PAGE,
  TEMPLATE_ANALYTICS, TEMPLATE_NAVBAR, TEMPLATE_STREAM_STATE_PARTIAL, TEMPLATE_STATUSBAR, TEMPLATE_CONTEST_STATE_PARTIAL,
  TEMPLATE_CONTEST_TIMER, TEMPLATE_TEAM_LIST, TEMPLATE_TEAM_CARD, TEMPLATE_POST_LIST,
  TEMPLATE_POST_PARTIAL, TEMPLATE_POST_SIMPLIFIED_PARTIAL, TEMPLATE_CATEGORY_LIST, TEMPLATE_CATEGORY_PARTIAL,
  TEMPLATE_TEAM_PROFILE_PARTIAL, TEMPLATE_SCOREBOARD_TABLE, TEMPLATE_SCOREBOARD_TABLE_ROW_PARTIAL, TEMPLATE_TASK_CONTENT_PARTIAL,
  TEMPLATE_CREATE_TASK_HINT_TEXTAREA_PARTIAL, TEMPLATE_CREATE_TASK_ANSWER_INPUT_PARTIAL,
  TEMPLATE_CREATE_TASK_REWARD_SCHEME_PARTIAL, TEMPLATE_CREATE_TASK_CHECK_METHOD_PARTIAL,
  TEMPLATE_EDIT_TASK_HINT_TEXTAREA_PARTIAL, TEMPLATE_EDIT_TASK_ANSWER_INPUT_PARTIAL,
  TEMPLATE_EDIT_TASK_REWARD_SCHEME_PARTIAL, TEMPLATE_EDIT_TASK_CHECK_METHOD_PARTIAL,
  TEMPLATE_TASK_LIST, TEMPLATE_TASK_CARD,
  TEMPLATE_REVISE_TASK_STATUS_PARTIAL, TEMPLATE_SUBMIT_TASK_STATUS_PARTIAL, TEMPLATE_REMOTE_CHECKER_LIST,
  TEMPLATE_REMOTE_CHECKER_BLOCK
} = require('./constants/template')

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
templateStore.register(TEMPLATE_SUPERVISOR_SIGNIN_PAGE, 'html/supervisor/signin.html')
templateStore.register(TEMPLATE_TEAM_SIGNIN_PAGE, 'html/team/signin.html')
templateStore.register(TEMPLATE_TEAM_RESTORE_PAGE, 'html/team/restore.html')
templateStore.register(TEMPLATE_TEAM_SIGNUP_PAGE, 'html/team/signup.html')
templateStore.register(TEMPLATE_TEAM_VERIFY_EMAIL_PAGE, 'html/team/verify-email.html')
templateStore.register(TEMPLATE_TEAM_RESET_PASSWORD_PAGE, 'html/team/reset-password.html')
templateStore.register(TEMPLATE_404_PAGE, 'html/404.html')
templateStore.register(TEMPLATE_500_PAGE, 'html/500.html')
templateStore.register(TEMPLATE_ROBOTS_PAGE, 'html/robots.html')

templateStore.register(TEMPLATE_ANALYTICS, 'html/analytics.html')

templateStore.register(TEMPLATE_NAVBAR, 'html/navbar-view.html')
templateStore.register(TEMPLATE_STREAM_STATE_PARTIAL, 'html/stream-state-partial.html')

templateStore.register(TEMPLATE_STATUSBAR, 'html/statusbar-view.html')
templateStore.register(TEMPLATE_CONTEST_STATE_PARTIAL, 'html/contest-state-partial.html')
templateStore.register(TEMPLATE_CONTEST_TIMER, 'html/contest-timer.html')

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

templateStore.register(TEMPLATE_REMOTE_CHECKER_LIST, 'html/remote-checker-list.html')
templateStore.register(TEMPLATE_REMOTE_CHECKER_BLOCK, 'html/remote-checker-block.html')

app.get('/', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_INDEX_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER
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
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_INDEX_PAGE)
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
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER,
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
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      countries: countries,
      teams: teams,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_TEAMS_PAGE)
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
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER,
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
      _: _,
      jsesc: jsesc,
      moment: moment,
      md: new MarkdownRenderer(),
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      posts: posts,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_NEWS_PAGE)
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
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER,
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
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      categories: categories,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_CATEGORIES_PAGE)
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
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER,
      TEMPLATE_TEAM_PROFILE_PARTIAL
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    teamController.fetchOne(request.teamId),
    countryController.fetch()
  ]

  if (request.scope.isSupervisor() || (request.scope.isTeam() && request.session.identityID === request.teamId)) {
    promises.push(taskController.fetch(request.scope.isSupervisor()))
    promises.push(teamTaskHitController.fetchForTeam(request.teamId))
    promises.push(teamTaskReviewController.fetchByTeam(request.teamId))
  } else {
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
    const exposeEmail = request.scope.isSupervisor() || (request.scope.isTeam() && request.session.identityID === values[3].id)
    const team = teamSerializer(values[3], { exposeEmail: exposeEmail })
    const countries = _.map(values[4], countrySerializer)

    let tasks = []
    let teamTaskHits = []
    let teamTaskHitStatistics = null
    let teamTaskReviews = []
    let teamTaskReviewStatistics = null
    if (request.scope.isSupervisor() || (request.scope.isTeam() && request.session.identityID === request.teamId)) {
      tasks = _.map(values[5], _.partial(taskSerializer, _, { preview: true }))
      teamTaskHits = _.map(values[6], teamTaskHitSerializer)
      teamTaskReviews = _.map(values[7], teamTaskReviewSerializer)
    } else {
      teamTaskHitStatistics = {
        count: values[6].length
      }
      teamTaskReviewStatistics = {
        count: values[7].length,
        averageRating: _.reduce(values[7], function (sum, review) {
          return sum + review.rating
        }, 0) / (values[7].length === 0 ? 1 : values[7].length)
      }
    }

    const pageTemplate = templates[TEMPLATE_TEAM_PROFILE_PAGE]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      team: team,
      countries: countries,
      tasks: tasks,
      teamTaskHits: teamTaskHits,
      teamTaskHitStatistics: teamTaskHitStatistics,
      teamTaskReviews: teamTaskReviews,
      teamTaskReviewStatistics: teamTaskReviewStatistics,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_TEAM_PROFILE_PAGE)
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
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER,
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
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      countries: countries,
      teams: teams,
      teamRankings: teamRankings,
      detailed: request.query.hasOwnProperty('detailed'),
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_SCOREBOARD_PAGE)
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/tasks', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TASKS_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL,
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER,
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
      TEMPLATE_SUBMIT_TASK_STATUS_PARTIAL
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
    const taskRewardSchemes = _.map(values[7], taskRewardSchemeSerializer)

    let teamTaskHits = []
    if (request.scope.isTeam()) {
      teamTaskHits = _.map(values[8], teamTaskHitSerializer)
    }

    let remoteCheckers = []
    let taskRemoteCheckers = []
    if (request.scope.isAdmin()) {
      remoteCheckers = _.map(values[8], remoteCheckerSerializer)
      taskRemoteCheckers = _.map(values[9], taskRemoteCheckerSerializer)
    }
    const pageTemplate = templates[TEMPLATE_TASKS_PAGE]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      categories: categories,
      taskPreviews: taskPreviews,
      taskCategories: taskCategories,
      taskValues: taskValues,
      taskRewardSchemes: taskRewardSchemes,
      teamTaskHits: teamTaskHits,
      remoteCheckers: remoteCheckers,
      taskRemoteCheckers: taskRemoteCheckers,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_TASKS_PAGE)
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
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER
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
      _: _,
      md: new MarkdownRenderer(),
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      teams: teams,
      task: task,
      taskHints: taskHints,
      teamTaskHits: teamTaskHits,
      teamTaskReviews: teamTaskReviews,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_TASK_STATISTICS_PAGE)
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
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER
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
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_ABOUT_PAGE)
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
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER
    ]),
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise.all(promises)
  .then(function (values) {
    const templates = values[0]
    const identity = values[1]
    const contest = contestSerializer(values[2])
    const pageTemplate = templates[TEMPLATE_CONTEST_PAGE]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_CONTEST_PAGE)
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
      TEMPLATE_STATUSBAR,
      TEMPLATE_CONTEST_STATE_PARTIAL,
      TEMPLATE_CONTEST_TIMER,
      TEMPLATE_REMOTE_CHECKER_LIST,
      TEMPLATE_REMOTE_CHECKER_BLOCK
    ]),
    identityController.fetch(request),
    contestController.fetch(),
    remoteCheckerController.fetch()
  ]

  Promise.all(promises)
  .then(function (values) {
    const templates = values[0]
    const identity = values[1]
    const contest = contestSerializer(values[2])
    const remoteCheckers = _.map(values[3], remoteCheckerSerializer)
    const pageTemplate = templates[TEMPLATE_REMOTE_CHECKERS_PAGE]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      remoteCheckers: remoteCheckers,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_REMOTE_CHECKERS_PAGE)
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
      TEMPLATE_STREAM_STATE_PARTIAL
    ]),
    identityController.fetch(request)
  ]

  Promise
  .all(promises)
  .then(function (values) {
    const templates = values[0]
    const identity = values[1]
    const pageTemplate = templates[TEMPLATE_SUPERVISOR_SIGNIN_PAGE]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_SUPERVISOR_SIGNIN_PAGE)
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
      TEMPLATE_STREAM_STATE_PARTIAL
    ]),
    identityController.fetch(request)
  ]

  Promise
  .all(promises)
  .then(function (values) {
    const templates = values[0]
    const identity = values[1]
    const pageTemplate = templates[TEMPLATE_TEAM_SIGNIN_PAGE]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_TEAM_SIGNIN_PAGE)
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/team/restore', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const promises = [
    templateStore.resolveAll([
      TEMPLATE_TEAM_RESTORE_PAGE,
      TEMPLATE_ANALYTICS,
      TEMPLATE_NAVBAR,
      TEMPLATE_STREAM_STATE_PARTIAL
    ]),
    identityController.fetch(request)
  ]

  Promise
  .all(promises)
  .then(function (values) {
    const templates = values[0]
    const identity = values[1]
    const pageTemplate = templates[TEMPLATE_TEAM_RESTORE_PAGE]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_TEAM_RESTORE_PAGE)
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
      TEMPLATE_STREAM_STATE_PARTIAL
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
      _: _,
      jsesc: jsesc,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      countries: countries,
      geoIPData: request.geoIPData,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_TEAM_SIGNUP_PAGE)
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
      TEMPLATE_STREAM_STATE_PARTIAL
    ]),
    identityController.fetch(request)
  ]

  Promise
  .all(promises)
  .then(function (values) {
    const templates = values[0]
    const identity = values[1]
    const pageTemplate = templates[TEMPLATE_TEAM_VERIFY_EMAIL_PAGE]
    verifyPromise(request)
    .then(function () {
      response.send(pageTemplate({
        _: _,
        jsesc: jsesc,
        identity: identity,
        contestTitle: request.contestTitle,
        success: true,
        text: 'Email verified. Thank you!',
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_TEAM_VERIFY_EMAIL_PAGE)
      }))
    })
    .catch(function (err2) {
      response.send(pageTemplate({
        _: _,
        jsesc: jsesc,
        identity: identity,
        contestTitle: request.contestTitle,
        success: false,
        text: err2.message,
        google_tag_id: googleTagId,
        templates: _.omit(templates, TEMPLATE_TEAM_VERIFY_EMAIL_PAGE)
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
      TEMPLATE_STREAM_STATE_PARTIAL
    ]),
    identityController.fetch(request)
  ]

  Promise
  .all(promises)
  .then(function (values) {
    const templates = values[0]
    const identity = values[1]
    const pageTemplate = templates[TEMPLATE_TEAM_RESET_PASSWORD_PAGE]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_TEAM_RESET_PASSWORD_PAGE)
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
      fqdn: process.env.THEMIS_QUALS_FQDN,
      secure: (process.env.THEMIS_QUALS_SECURE === 'yes')
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
      TEMPLATE_STREAM_STATE_PARTIAL
    ]),
    identityController.fetch(request)
  ]

  Promise
  .all(promises)
  .then(function (values) {
    const templates = values[0]
    const identity = values[1]
    const pageTemplate = templates[TEMPLATE_404_PAGE]
    response.status(404).send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      urlPath: request.path,
      google_tag_id: googleTagId,
      templates: _.omit(templates, TEMPLATE_404_PAGE)
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
          TEMPLATE_STREAM_STATE_PARTIAL
        ]),
        identityController.fetch(request)
      ]

      Promise
      .all(promises)
      .then(function (values) {
        const templates = values[0]
        const identity = values[1]
        const pageTemplate = templates[TEMPLATE_500_PAGE]
        response.status(500).send(pageTemplate({
          _: _,
          jsesc: jsesc,
          identity: identity,
          contestTitle: request.contestTitle,
          google_tag_id: googleTagId,
          templates: _.omit(templates, TEMPLATE_500_PAGE)
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

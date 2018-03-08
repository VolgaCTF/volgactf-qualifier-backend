const express = require('express')
const logger = require('./utils/logger')

const apiRouter = require('./routes/api')

const { BaseError } = require('./utils/errors')

const { session, detectScope } = require('./middleware/session')
const { issueToken } = require('./middleware/security')

const fs = require('fs')
const path = require('path')
const _ = require('underscore')
const moment = require('moment')
const identityController = require('./controllers/identity')
const contestController = require('./controllers/contest')
const contestSerializer = require('./serializers/contest')
const teamScoreController = require('./controllers/team-score')
const teamScoreSerializer = require('./serializers/team-score')
const countryController = require('./controllers/country')
const countrySerializer = require('./serializers/country')

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

const jsesc = require('jsesc')

const app = express()
app.set('x-powered-by', false)
app.set('trust proxy', true)

app.use(session)

app.use('/api', apiRouter)

const distFrontendDir = process.env.THEMIS_QUALS_DIST_FRONTEND_DIR
const googleTagId = (process.env.GOOGLE_TAG_ID && process.env.GOOGLE_TAG_ID !== '') ? process.env.GOOGLE_TAG_ID : null

app.get('/', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'index.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))

  let promises = [
    identityController.fetch(request),
    contestController.fetch()
  ]

  if (request.scope.isTeam()) {
    promises.push(teamScoreController.fetch())
  }

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    let teamScores = []
    if (request.scope.isTeam()) {
      teamScores = _.map(values[2], teamScoreSerializer)
    }
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/teams', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'teams.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))
  const teamListTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team-list.html'), 'utf8'))
  const teamCardTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team-card.html'), 'utf8'))

  let promises = [
    identityController.fetch(request),
    contestController.fetch(),
    countryController.fetch(),
    teamController.fetch(!request.scope.isSupervisor())
  ]

  if (request.scope.isTeam()) {
    promises.push(teamScoreController.fetch())
  }

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    const countries = _.map(values[2], countrySerializer)
    const teams = _.map(values[3], _.partial(teamSerializer, _, { exposeEmail: request.scope.isSupervisor() }))
    let teamScores = []
    if (request.scope.isTeam()) {
      teamScores = _.map(values[4], teamScoreSerializer)
    }
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      countries: countries,
      teams: teams,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate,
        teamList: teamListTemplate,
        teamCard: teamCardTemplate
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/news', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'news.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))
  const postListTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'post-list.html'), 'utf8'))
  const postPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'post-partial.html'), 'utf8'))
  const postSimplifiedPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'post-simplified-partial.html'), 'utf8'))

  const md = new MarkdownRenderer()

  let promises = [
    identityController.fetch(request),
    contestController.fetch(),
    postController.fetch()
  ]

  if (request.scope.isTeam()) {
    promises.push(teamScoreController.fetch())
  }

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    const posts = _.map(values[2], postSerializer)
    let teamScores = []
    if (request.scope.isTeam()) {
      teamScores = _.map(values[3], teamScoreSerializer)
    }
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      md: md,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      posts: posts,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate,
        postList: postListTemplate,
        postPartial: postPartialTemplate,
        postSimplifiedPartial: postSimplifiedPartialTemplate
      }
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

  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'categories.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))

  const categoryListTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'category-list.html'), 'utf8'))
  const categoryPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'category-partial.html'), 'utf8'))

  let promises = [
    identityController.fetch(request),
    contestController.fetch(),
    categoryController.fetch()
  ]

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    const categories = _.map(values[2], categorySerializer)
    let teamScores = []
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      categories: categories,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate,
        categoryList: categoryListTemplate,
        categoryPartial: categoryPartialTemplate
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.param('teamId', teamParam.id)

app.get('/team/:teamId/profile', detectScope, issueToken, getGeoIPData, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'profile.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))

  const teamProfilePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team-profile-partial.html'), 'utf8'))

  let promises = [
    identityController.fetch(request),
    contestController.fetch(),
    teamController.fetchOne(request.teamId),
    countryController.fetch()
  ]

  if (request.scope.isTeam()) {
    promises.push(teamScoreController.fetch())
  }

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    const exposeEmail = request.scope.isSupervisor() || (request.scope.isTeam() && request.session.identityID === values[2].id)
    const team = teamSerializer(values[2], { exposeEmail: exposeEmail })
    const countries = _.map(values[3], countrySerializer)
    let teamScores = []
    if (request.scope.isTeam()) {
      teamScores = _.map(values[4], teamScoreSerializer)
    }
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      team: team,
      countries: countries,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate,
        teamProfilePartial: teamProfilePartialTemplate
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/scoreboard', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'scoreboard.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))

  const scoreboardTableTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'scoreboard-table.html'), 'utf8'))
  const scoreboardTableRowPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'scoreboard-table-row-partial.html'), 'utf8'))

  let promises = [
    identityController.fetch(request),
    contestController.fetch(),
    countryController.fetch(),
    teamController.fetch(!request.scope.isSupervisor()),
    teamScoreController.fetch()
  ]

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    const countries = _.map(values[2], countrySerializer)
    const teams = _.map(values[3], _.partial(teamSerializer, _, { exposeEmail: request.scope.isSupervisor() }))
    const teamScores = _.map(values[4], teamScoreSerializer)
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      countries: countries,
      teams: teams,
      teamScores: teamScores,
      detailed: request.query.hasOwnProperty('detailed'),
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate,
        scoreboardTable: scoreboardTableTemplate,
        scoreboardTableRowPartial: scoreboardTableRowPartialTemplate
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/tasks', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'tasks.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))

  const taskContentPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'task-content-partial.html'), 'utf8'))
  const createTaskHintTextareaPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'create-task-hint-textarea-partial.html'), 'utf8'))
  const createTaskAnswerInputPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'create-task-answer-input-partial.html'), 'utf8'))
  const editTaskHintTextareaPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'edit-task-hint-textarea-partial.html'), 'utf8'))
  const editTaskAnswerInputPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'edit-task-answer-input-partial.html'), 'utf8'))

  const taskListTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'task-list.html'), 'utf8'))
  const taskCardTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'task-card.html'), 'utf8'))
  const reviseTaskStatusPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'revise-task-status-partial.html'), 'utf8'))
  const submitTaskStatusPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'submit-task-status-partial.html'), 'utf8'))

  let promises = [
    identityController.fetch(request),
    contestController.fetch(),
    categoryController.fetch(),
    taskController.fetch(request.scope.isSupervisor()),
    taskCategoryController.fetch(request.scope.isSupervisor())
  ]

  if (request.scope.isTeam()) {
    promises.push(teamTaskHitController.fetchForTeam(request.session.identityID))
    promises.push(teamScoreController.fetch())
  }

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    const categories = _.map(values[2], categorySerializer)
    const taskPreviews = _.map(values[3], _.partial(taskSerializer, _, { preview: true }))
    const taskCategories = _.map(values[4], taskCategorySerializer)
    let teamHits = []
    let teamScores = []
    if (request.scope.isTeam()) {
      teamHits = _.map(values[5], teamTaskHitSerializer)
      teamScores = _.map(values[6], teamScoreSerializer)
    }
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
      teamHits: teamHits,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate,
        taskContentPartial: taskContentPartialTemplate,
        createTaskHintTextareaPartial: createTaskHintTextareaPartialTemplate,
        createTaskAnswerInputPartial: createTaskAnswerInputPartialTemplate,
        editTaskHintTextareaPartial: editTaskHintTextareaPartialTemplate,
        editTaskAnswerInputPartial: editTaskAnswerInputPartialTemplate,
        taskList: taskListTemplate,
        taskCard: taskCardTemplate,
        reviseTaskStatusPartial: reviseTaskStatusPartialTemplate,
        submitTaskStatusPartial: submitTaskStatusPartialTemplate
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/about', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'about.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))

  let promises = [
    identityController.fetch(request),
    contestController.fetch()
  ]

  if (request.scope.isTeam()) {
    promises.push(teamScoreController.fetch())
  }

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    let teamScores = []
    if (request.scope.isTeam()) {
      teamScores = _.map(values[2], teamScoreSerializer)
    }
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate
      }
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

  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))

  let promises = [
    identityController.fetch(request),
    contestController.fetch()
  ]

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    let teamScores = []
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate
      }
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

  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'remote_checkers.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))

  const remoteCheckerListTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'remote-checker-list.html'), 'utf8'))
  const remoteCheckerBlockTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'remote-checker-block.html'), 'utf8'))

  let promises = [
    identityController.fetch(request),
    contestController.fetch(),
    remoteCheckerController.fetch()
  ]

  Promise.all(promises)
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    const remoteCheckers = _.map(values[2], remoteCheckerSerializer)
    let teamScores = []
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      moment: moment,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      remoteCheckers: remoteCheckers,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestScore: contestScoreTemplate,
        remoteCheckerList: remoteCheckerListTemplate,
        remoteCheckerBlock: remoteCheckerBlockTemplate
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/supervisor/signin', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'supervisor', 'signin.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/team/signin', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'signin.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/team/restore', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'restore.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/team/signup', detectScope, issueToken, getGeoIPData, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'signup.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request),
    contestController.fetch(),
    countryController.fetch()
  ])
  .then(function (values) {
    const identity = values[0]
    const contest = contestSerializer(values[1])
    const countries = _.map(values[2], countrySerializer)
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contest: contest,
      contestTitle: request.contestTitle,
      countries: countries,
      geoIPData: request.geoIPData,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
      }
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
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'verify-email.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]

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
        templates: {
          analytics: analyticsTemplate,
          navbar: navbarTemplate,
          streamStatePartial: streamStatePartialTemplate,
        }
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
        templates: {
          navbar: navbarTemplate,
          streamStatePartial: streamStatePartialTemplate,
        }
      }))
    })
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/team/reset-password', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'reset-password.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
      }
    }))
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

app.get('/robots.txt', function (request, response) {
  const template = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'robots.html'), 'utf8'))
  response
    .set('content-type', 'text/plain')
    .send(template({
      fqdn: process.env.THEMIS_QUALS_FQDN,
      secure: (process.env.THEMIS_QUALS_SECURE === 'yes')
    }))
})

app.get('*', detectScope, issueToken, getContestTitle, function (request, response, next) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', '404.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.status(404).send(pageTemplate({
      _: _,
      jsesc: jsesc,
      identity: identity,
      contestTitle: request.contestTitle,
      urlPath: request.path,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        streamStatePartial: streamStatePartialTemplate,
      }
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
      const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', '500.html'), 'utf8'))
      const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

      const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
      const streamStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'stream-state-partial.html'), 'utf8'))

      Promise.all([
        identityController.fetch(request)
      ])
      .then(function (values) {
        const identity = values[0]
        response.status(500).send(pageTemplate({
          _: _,
          jsesc: jsesc,
          identity: identity,
          contestTitle: request.contestTitle,
          google_tag_id: googleTagId,
          templates: {
            analytics: analyticsTemplate,
            navbar: navbarTemplate,
            streamStatePartial: streamStatePartialTemplate,
          }
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

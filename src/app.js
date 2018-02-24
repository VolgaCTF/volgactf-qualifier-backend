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

const { contestNotFinished } = require('./middleware/contest')
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

const teamParam = require('./params/team')

const app = express()
app.set('x-powered-by', false)
app.set('trust proxy', true)

app.use(session)

app.use('/api', apiRouter)

const distFrontendDir = process.env.THEMIS_QUALS_DIST_FRONTEND_DIR
const googleTagId = (process.env.GOOGLE_TAG_ID && process.env.GOOGLE_TAG_ID !== '') ? process.env.GOOGLE_TAG_ID : null

app.get('/', detectScope, issueToken, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'index.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestRealtimeStateTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-realtime-state.html'), 'utf8'))
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
      moment: moment,
      identity: identity,
      contest: contest,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestRealtimeState: contestRealtimeStateTemplate,
        contestScore: contestScoreTemplate
      }
    }))
  })
  .catch(function (err) {
    console.log(err)
    throw err
  })
})

app.get('/teams', detectScope, issueToken, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'teams.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestRealtimeStateTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-realtime-state.html'), 'utf8'))
  const contestScoreTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-score.html'), 'utf8'))
  const teamListTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team-list.html'), 'utf8'))
  const teamProfileSimplifiedPartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team-profile-simplified-partial.html'), 'utf8'))

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
      moment: moment,
      identity: identity,
      contest: contest,
      countries: countries,
      teams: teams,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestRealtimeState: contestRealtimeStateTemplate,
        contestScore: contestScoreTemplate,
        teamList: teamListTemplate,
        teamProfileSimplifiedPartial: teamProfileSimplifiedPartialTemplate
      }
    }))
  })
  .catch(function (err) {
    console.log(err)
    throw err
  })
})

app.get('/news', detectScope, issueToken, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'news.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestRealtimeStateTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-realtime-state.html'), 'utf8'))
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
      moment: moment,
      md: md,
      identity: identity,
      contest: contest,
      posts: posts,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestRealtimeState: contestRealtimeStateTemplate,
        contestScore: contestScoreTemplate,
        postList: postListTemplate,
        postPartial: postPartialTemplate,
        postSimplifiedPartial: postSimplifiedPartialTemplate
      }
    }))
  })
  .catch(function (err) {
    console.log(err)
    throw err
  })
})

app.param('teamId', teamParam.id)

app.get('/team/:teamId/profile', detectScope, issueToken, getGeoIPData, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'profile.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestRealtimeStateTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-realtime-state.html'), 'utf8'))
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
      moment: moment,
      identity: identity,
      contest: contest,
      team: team,
      countries: countries,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestRealtimeState: contestRealtimeStateTemplate,
        contestScore: contestScoreTemplate,
        teamProfilePartial: teamProfilePartialTemplate
      }
    }))
  })
  .catch(function (err) {
    console.log(err)
    throw err
  })
})

app.get('/about', detectScope, issueToken, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'about.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))
  const statusbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'statusbar-view.html'), 'utf8'))
  const contestStatePartialTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-state-partial.html'), 'utf8'))
  const contestTimerTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-timer.html'), 'utf8'))
  const contestRealtimeStateTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'contest-realtime-state.html'), 'utf8'))
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
      moment: moment,
      identity: identity,
      contest: contest,
      teamScores: teamScores,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate,
        statusbar: statusbarTemplate,
        contestStatePartial: contestStatePartialTemplate,
        contestTimer: contestTimerTemplate,
        contestRealtimeState: contestRealtimeStateTemplate,
        contestScore: contestScoreTemplate
      }
    }))
  })
  .catch(function (err) {
    console.log(err)
    throw err
  })
})

app.get('/supervisor/signin', detectScope, issueToken, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'supervisor', 'signin.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.send(pageTemplate({
      _: _,
      identity: identity,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate
      }
    }))
  })
  .catch(function (err) {
    throw err
  })
})

app.get('/team/signin', detectScope, issueToken, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'signin.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.send(pageTemplate({
      _: _,
      identity: identity,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate
      }
    }))
  })
  .catch(function (err) {
    throw err
  })
})

app.get('/team/restore', detectScope, issueToken, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'restore.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.send(pageTemplate({
      _: _,
      identity: identity,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate
      }
    }))
  })
  .catch(function (err) {
    throw err
  })
})

app.get('/team/signup', detectScope, issueToken, getGeoIPData, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'signup.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))

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
      identity: identity,
      contest: contest,
      countries: countries,
      geoIPData: request.geoIPData,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate
      }
    }))
  })
  .catch(function (err) {
    throw err
  })
})

function verifyPromise (request) {
  return new Promise(function (resolve, reject) {
    const verifyConstraints = {
      team: constraints.base64url,
      code: constraints.base64url
    }

    console.log(request.query.team)
    console.log(request.query.code)
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

app.get('/team/verify-email', detectScope, issueToken, contestNotFinished, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'verify-email.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]

    verifyPromise(request)
    .then(function () {
      response.send(pageTemplate({
        _: _,
        identity: identity,
        success: true,
        text: 'Email verified. Thank you!',
        google_tag_id: googleTagId,
        templates: {
          analytics: analyticsTemplate,
          navbar: navbarTemplate
        }
      }))
    })
    .catch(function (err2) {
      response.send(pageTemplate({
        _: _,
        identity: identity,
        success: false,
        text: err2.message,
        templates: {
          navbar: navbarTemplate
        }
      }))
    })
  })
  .catch(function (err) {
    throw err
  })
})

app.get('/team/reset-password', detectScope, issueToken, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'team', 'reset-password.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.send(pageTemplate({
      _: _,
      identity: identity,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate
      }
    }))
  })
  .catch(function (err) {
    throw err
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

app.get('*', detectScope, issueToken, function (request, response) {
  const pageTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', '404.html'), 'utf8'))
  const analyticsTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'analytics.html'), 'utf8'))

  const navbarTemplate = _.template(fs.readFileSync(path.join(distFrontendDir, 'html', 'navbar-view.html'), 'utf8'))

  Promise.all([
    identityController.fetch(request)
  ])
  .then(function (values) {
    const identity = values[0]
    response.status(404).send(pageTemplate({
      _: _,
      identity: identity,
      urlPath: request.path,
      google_tag_id: googleTagId,
      templates: {
        analytics: analyticsTemplate,
        navbar: navbarTemplate
      }
    }))
  })
  .catch(function (err) {
    throw err
  })
})

app.use(function (err, request, response, next) {
  if (err instanceof BaseError) {
    response.status(err.getHttpStatus())
    response.json(err.message)
  } else {
    logger.error(err)
    response.status(500)
    response.json('Internal Server Error')
  }
})

module.exports = app

const request = require('request')
const _ = require('underscore')
const gitPullOrClone = require('git-pull-or-clone')

class GitHubController {
  constructor () {
    this.githubOrg = 'VolgaCTF'
  }

  listRepositoriesPage (pageNum) {
    const that = this
    return new Promise(function (resolve, reject) {
      const params = {
        method: 'GET',
        url: `https://api.github.com/orgs/${that.githubOrg}/repos`,
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'User-Agent': 'VolgaCTF',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        qs: {
          per_page: 100,
          page: pageNum
        }
      }

      request(params, function (err, response, body) {
        if (err) {
          reject(err)
        } else {
          if (response.statusCode === 200) {
            const repositories = _.map(JSON.parse(body), function (item) {
              return item.full_name
            })

            if (response.headers.link && response.headers.link.includes('; rel="next"')) {
              that
                .listRepositoriesPage(pageNum + 1)
                .then(function (nextPageRepositories) {
                  resolve(repositories.concat(nextPageRepositories))
                })
                .catch(function (err) {
                  reject(err)
                })
            } else {
              resolve(repositories)
            }
          } else {
            reject(new Error(`Request to GitHub API failed with HTTP status code ${response.statusCode}`))
          }
        }
      })
    })
  }

  listRepositories () {
    return this.listRepositoriesPage(1)
  }

  cloneRepository (repository, path) {
    const url = `https://oauth2:${process.env.GITHUB_TOKEN}@github.com/${repository}.git`
    return new Promise(function (resolve, reject) {
      gitPullOrClone(url, path, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

module.exports = new GitHubController()

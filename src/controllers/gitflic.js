const request = require('request')
const _ = require('underscore')
const gitPullOrClone = require('git-pull-or-clone')

class GitFlicController {
  constructor () {
    this.gitFlicOwner = process.env.GITFLIC_ORG
  }

  listRepositoriesPage (pageNum) {
    const that = this
    return new Promise(function (resolve, reject) {
      const params = {
        method: 'GET',
        url: 'https://api.gitflic.ru/project/shared',
        headers: {
          accept: 'application/json',
          authorization: `token ${process.env.GITFLIC_API_TOKEN}`,
          'User-Agent': 'VolgaCTF'
        },
        qs: {
          size: 100,
          page: pageNum
        }
      }

      request(params, function (err, response, body) {
        if (err) {
          reject(err)
        } else {
          if (response.statusCode === 200) {
            const parsedBody = JSON.parse(body)

            const filteredData = _.filter(parsedBody._embedded.projectList, function (item) {
              return item.owner && item.owner.alias && item.owner.alias === that.gitFlicOwner
            })

            const repositories = _.map(filteredData, function (item) {
              return `${that.gitFlicOwner}/${item.alias}`
            })

            if (parsedBody.page && parsedBody.page.number && parsedBody.page.totalPages && (parsedBody.page.number + 1 < parsedBody.page.totalPages)) {
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
            reject(new Error(`Request to GitFlic API failed with HTTP status code ${response.statusCode}`))
          }
        }
      })
    })
  }

  listRepositories () {
    return this.listRepositoriesPage(0)
  }

  cloneRepository (repository, path) {
    const url = `git@gitflic.ru:${repository}.git`
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

module.exports = new GitFlicController()

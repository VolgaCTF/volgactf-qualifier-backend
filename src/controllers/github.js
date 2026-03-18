const request = require('request')
const axios = require('axios')
const _ = require('underscore')
const gitPullOrClone = require('git-pull-or-clone')

class GitHubController {
  constructor () {
    this.githubOrg = process.env.GITHUB_ORG
    this.filterTopics = (process.env.GITHUB_FILTER_TOPICS || '').split(',').filter(function (x) {
      return x.length > 0
    })
  }

  isEnabled () {
    return Object.hasOwn(process.env, 'GITHUB_ORG') &&
      process.env.GITHUB_ORG !== '' &&
      Object.hasOwn(process.env, 'GITHUB_TOKEN') &&
      process.env.GITHUB_TOKEN !== ''
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

  listRepositoriesByTopicPage(topic, page = 1, accumulated = []) {
    const that = this
    return new Promise(function (resolve, reject) {
      axios.get('https://api.github.com/search/repositories', {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'User-Agent': 'VolgaCTF'
        },
        params: {
          q: `org:${that.githubOrg} topic:${topic}`,
          per_page: 100,
          page
        }
      })
      .then(function (res) {
        const repoNames = res.data.items.map(function (item) {
          return item.full_name
        })
        accumulated.push(...repoNames)

        const totalCount = res.data.total_count
        const fetched = page * that.perPage
        if (fetched < totalCount) {
          that.listRepositoriesByTopicPage(page + 1, accumulated)
          .then(resolve)
          .catch(reject)
        } else {
          resolve(accumulated)
        }
      })
      .catch(reject)
    })
  }

  listRepositoriesByTopic(topic) {
    return this.listRepositoriesByTopicPage(topic)
  }

  listRepositoriesByTopics(topics) {
    const that = this
    const promises = this.filterTopics.map(function (topic) {
      return that.listRepositoriesByTopic(topic)
    })

    return Promise.all(promises)
      .then(function (results) {
        const allRepos = new Set()
        results.forEach(function (arr) {
          arr.forEach(function (name) {
            allRepos.add(name)
          })
        })
        return Array.from(allRepos)
      })
  }

  listRepositories () {
    if (this.filterTopics.length == 0) {
      return this.listRepositoriesPage(1)
    } else {
      return this.listRepositoriesByTopics()
    }
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

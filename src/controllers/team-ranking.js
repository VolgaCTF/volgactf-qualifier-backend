const TeamRanking = require('../models/team-ranking')

class TeamRankingController {
  fetch () {
    return new Promise(function (resolve, reject) {
      TeamRanking
        .query()
        .then(function (teamRankings) {
          resolve(teamRankings)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }
}

module.exports = new TeamRankingController()

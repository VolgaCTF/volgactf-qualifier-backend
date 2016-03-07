import TeamController from './team'
import TeamScore from '../models/team-score'
import _ from 'underscore'
import logger from '../utils/logger'

class TeamScoreController {
  static index (callback) {
    TeamController.index((err, teams) => {
      if (err) {
        callback(err, null)
      } else {
        TeamScore
          .query()
          .then((teamScores) => {
            callback(null, _.map(teams, (team) => {
              let teamScore = _.findWhere(teamScores, { teamId: team.id })
              if (!teamScore) {
                teamScore = {
                  teamId: team.id,
                  score: 0,
                  updatedAt: null
                }
              }

              return teamScore
            }))
          })
          .catch((err) => {
            logger.error(err)
            callback(err, null)
          })
      }
    }, true)
  }
}

export default TeamScoreController

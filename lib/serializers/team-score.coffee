
module.exports = (teamScore) ->
    result =
        teamId: teamScore.teamId
        score: teamScore.score
        updatedAt: if teamScore.updatedAt? then teamScore.updatedAt.getTime() else null

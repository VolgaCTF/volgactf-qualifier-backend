
module.exports = (teamScore) ->
    result =
        team: teamScore.team
        score: teamScore.score
        updatedAt: if teamScore.updatedAt? then teamScore.updatedAt.getTime() else null

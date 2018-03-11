module.exports = function (teamRanking) {
  return {
    id: teamRanking.id,
    teamId: teamRanking.teamId,
    position: teamRanking.position,
    score: teamRanking.score,
    lastUpdated: (teamRanking.lastUpdated) ? teamRanking.lastUpdated.getTime() : null
  }
}

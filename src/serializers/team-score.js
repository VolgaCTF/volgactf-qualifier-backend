
export default function (teamScore) {
  return {
    teamId: teamScore.teamId,
    score: teamScore.score,
    updatedAt: (teamScore.updatedAt) ? teamScore.updatedAt.getTime() : null
  }
}

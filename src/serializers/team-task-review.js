export default function (teamTaskReview) {
  return {
    id: teamTaskReview.id,
    teamId: teamTaskReview.teamId,
    taskId: teamTaskReview.taskId,
    rating: teamTaskReview.rating,
    comment: teamTaskReview.comment,
    createdAt: teamTaskReview.createdAt.getTime()
  }
}

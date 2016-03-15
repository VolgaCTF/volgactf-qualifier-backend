export default function (teamTaskReview) {
  return {
    id: teamTaskReview.id,
    teamId: teamTaskReview.teamId,
    taskId: teamTaskReview.taskId,
    rating: teamTaskReview.rating,
    review: teamTaskReview.review,
    createdAt: teamTaskReview.createdAt.getTime()
  }
}

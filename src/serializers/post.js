
export default function(post) {
  return {
    id: post._id,
    title: post.title,
    description: post.description,
    createdAt: post.createdAt.getTime(),
    updatedAt: post.updatedAt.getTime()
  }
}

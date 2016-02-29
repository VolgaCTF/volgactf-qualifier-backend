export default function (category) {
  return {
    id: category.id,
    title: category.title,
    description: category.description,
    createdAt: category.createdAt.getTime(),
    updatedAt: category.updatedAt.getTime()
  }
}

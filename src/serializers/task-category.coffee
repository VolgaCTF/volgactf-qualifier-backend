
module.exports = (taskCategory) ->
    result =
        id: taskCategory._id
        title: taskCategory.title
        description: taskCategory.description
        createdAt: taskCategory.createdAt.getTime()
        updatedAt: taskCategory.updatedAt.getTime()

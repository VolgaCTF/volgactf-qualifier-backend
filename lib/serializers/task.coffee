_ = require 'underscore'

module.exports = (task, options = {}) ->
    defaultOptions =
        preview: no
    options = _.extend defaultOptions, options

    result =
        id: task._id
        title: task.title
        value: task.value
        createdAt: task.createdAt.getTime()
        updatedAt: task.updatedAt.getTime()
        categories: task.categories
        state: task.state

    if not options.preview
        result.description = task.description
        result.hints = task.hints

    result

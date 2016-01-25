_ = require 'underscore'

module.exports = (task, options = {}) ->
    defaultOptions =
        preview: no
        full: no
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

    if options.full
        result.description = task.description
        result.hints = task.hints
        result.answers = task.answers
        result.caseSensitive = task.caseSensitive

    result

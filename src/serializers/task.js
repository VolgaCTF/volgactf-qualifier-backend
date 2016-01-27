import _ from 'underscore'

export default function(task, options = {}) {
  let defaultOptions = {
    preview: false,
    full: false
  }
  options = _.extend(defaultOptions, options)

  let result = {
    id: task._id,
    title: task.title,
    value: task.value,
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
    categories: task.categories,
    state: task.state
  }

  if (!options.preview) {
    result.description = task.description
    result.hints = task.hints
  }

  if (options.full) {
    result.description = task.description
    result.hints = task.hints
    result.answers = task.answers
    result.caseSensitive = task.caseSensitive
  }

  return result
}

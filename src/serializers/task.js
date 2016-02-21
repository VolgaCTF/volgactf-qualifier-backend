import _ from 'underscore'

export default function (task, options = {}) {
  let defaultOptions = {
    preview: false
  }
  options = _.extend(defaultOptions, options)

  let result = {
    id: task.id,
    title: task.title,
    value: task.value,
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
    state: task.state
  }

  if (!options.preview) {
    result.description = task.description
    result.hints = task.hints
  }

  return result
}

const _ = require('underscore')

module.exports = function (task, options = {}) {
  const defaultOptions = {
    preview: false
  }
  options = _.extend(defaultOptions, options)

  const result = {
    id: task.id,
    title: task.title,
    value: task.value,
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
    state: task.state
  }

  if (!options.preview) {
    result.description = task.description
  }

  return result
}

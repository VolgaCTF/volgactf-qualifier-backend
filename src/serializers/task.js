const _ = require('underscore')

module.exports = function (task, options = {}) {
  const defaultOptions = {
    preview: false
  }
  options = _.extend(defaultOptions, options)

  const result = {
    id: task.id,
    title: task.title,
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
    state: task.state,
    openAt: _.isNull(task.openAt) ? null : task.openAt.getTime()
  }

  if (!options.preview) {
    result.description = task.description
  }

  return result
}

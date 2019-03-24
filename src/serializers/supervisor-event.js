const eventNameList = require('../utils/event-name-list')

module.exports = function (event) {
  return {
    id: event.id,
    name: eventNameList.getName(event.type),
    data: event.data.supervisors,
    createdAt: event.createdAt.getTime()
  }
}

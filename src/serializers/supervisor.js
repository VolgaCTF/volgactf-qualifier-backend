module.exports = function (supervisor) {
  return {
    id: supervisor.id,
    username: supervisor.username,
    rights: supervisor.rights
  }
}

module.exports = function (remoteChecker) {
  return {
    id: remoteChecker.id,
    name: remoteChecker.name,
    url: remoteChecker.url,
    authUsername: remoteChecker.authUsername,
    createdAt: remoteChecker.createdAt.getTime(),
    updatedAt: remoteChecker.updatedAt.getTime()
  }
}

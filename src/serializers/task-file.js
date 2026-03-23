function getLocalTaskFileUrl(taskFile) {
  return `http${process.env.VOLGACTF_QUALIFIER_SECURE === 'yes' ? 's' : ''}://${process.env.VOLGACTF_QUALIFIER_FQDN}/files/${taskFile.prefix}/${taskFile.filename}`
}

function getRemoteTaskFileUrl(taskFile) {
  return `https://${process.env.VOLGACTF_QUALIFIER_REMOTE_FILESTORE_FQDN}/${taskFile.prefix}/${taskFile.filename}`
}

module.exports = function (taskFile) {
  return {
    id: taskFile.id,
    taskId: taskFile.taskId,
    filename: taskFile.filename,
    remote: taskFile.remote,
    downloadUrl: taskFile.remote ? getRemoteTaskFileUrl(taskFile) : getLocalTaskFileUrl(taskFile),
    createdAt: taskFile.createdAt.getTime()
  }
}

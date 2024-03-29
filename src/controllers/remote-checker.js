const RemoteChecker = require('../models/remote-checker')
const { InternalError, DuplicateRemoteCheckerNameError, RemoteCheckerNotFoundError, RemoteCheckerAttachedError } = require('../utils/errors')
const EventController = require('./event')

const logger = require('../utils/logger')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION, POSTGRES_FOREIGN_KEY_CONSTRAINT_VIOLATION } = require('../utils/constants')

const CreateRemoteCheckerEvent = require('../events/create-remote-checker')
const UpdateRemoteCheckerEvent = require('../events/update-remote-checker')
const DeleteRemoteCheckerEvent = require('../events/delete-remote-checker')

function isRemoteCheckerNameUniqueConstraintViolation (err) {
  return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'remote_checkers_ndx_name_unique')
}

function isTaskRemoteCheckerForeignKeyConstraintViolation (err) {
  return (err.code && err.code === POSTGRES_FOREIGN_KEY_CONSTRAINT_VIOLATION && err.table && err.table === 'task_remote_checkers')
}

class RemoteCheckerController {
  fetch () {
    return new Promise(function (resolve, reject) {
      RemoteChecker
        .query()
        .then(function (remoteCheckers) {
          resolve(remoteCheckers)
        })
        .catch(function (err) {
          logger.error(err)
          reject(err)
        })
    })
  }

  get (id) {
    return new Promise(function (resolve, reject) {
      RemoteChecker
        .query()
        .where('id', id)
        .first()
        .then(function (remoteChecker) {
          if (remoteChecker) {
            resolve(remoteChecker)
          } else {
            reject(new RemoteCheckerNotFoundError())
          }
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  create (name, url, authUsername, authPassword) {
    return new Promise(function (resolve, reject) {
      const now = new Date()
      RemoteChecker
        .query()
        .insert({
          name,
          url,
          authUsername,
          authPassword,
          createdAt: now,
          updatedAt: now
        })
        .then(function (remoteChecker) {
          EventController.push(new CreateRemoteCheckerEvent(remoteChecker))
          resolve(remoteChecker)
        })
        .catch(function (err) {
          if (isRemoteCheckerNameUniqueConstraintViolation(err)) {
            reject(new DuplicateRemoteCheckerNameError())
          } else {
            logger.error(err)
            reject(new InternalError())
          }
        })
    })
  }

  update (id, name, url, authUsername, authPassword) {
    return new Promise(function (resolve, reject) {
      RemoteChecker
        .query()
        .patchAndFetchById(id, {
          name,
          url,
          authUsername,
          authPassword,
          updatedAt: new Date()
        })
        .then(function (remoteChecker) {
          EventController.push(new UpdateRemoteCheckerEvent(remoteChecker))
          resolve(remoteChecker)
        })
        .catch(function (err) {
          if (isRemoteCheckerNameUniqueConstraintViolation(err)) {
            reject(new DuplicateRemoteCheckerNameError())
          } else {
            logger.error(err)
            reject(new InternalError())
          }
        })
    })
  }

  delete (id) {
    return new Promise(function (resolve, reject) {
      RemoteChecker
        .query()
        .delete()
        .where('id', id)
        .returning('*')
        .then(function (remoteCheckers) {
          if (remoteCheckers.length === 1) {
            EventController.push(new DeleteRemoteCheckerEvent(remoteCheckers[0]))
            resolve()
          } else {
            reject(new RemoteCheckerNotFoundError())
          }
        })
        .catch(function (err) {
          if (isTaskRemoteCheckerForeignKeyConstraintViolation(err)) {
            reject(new RemoteCheckerAttachedError())
          } else {
            logger.error(err)
            reject(new InternalError())
          }
        })
    })
  }
}

module.exports = new RemoteCheckerController()

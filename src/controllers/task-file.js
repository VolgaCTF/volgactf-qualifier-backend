const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const logger = require('../utils/logger')
const { InternalError, DuplicateTaskFilenameError, TaskFileNotFoundError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION } = require('../utils/constants')
const TaskFile = require('../models/task-file')

const EventController = require('./event')
const CreateTaskFileEvent = require('../events/create-task-file')
const DeleteTaskFileEvent = require('../events/delete-task-file')

class TaskFileController {
  constructor () {
    this.taskFileBaseDir = process.env.THEMIS_QUALS_TASK_FILES_DIR
  }

  fetchById (id) {
    return new Promise(function (resolve, reject) {
      TaskFile
      .query()
      .where('id', id)
      .first()
      .then(function (taskFile) {
        if (taskFile) {
          resolve(taskFile)
        } else {
          reject(new TaskFileNotFoundError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        reject(new InternalError())
      })
    })
  }

  fetchByTask (taskId) {
    return new Promise(function (resolve, reject) {
      TaskFile
      .query()
      .where('taskId', taskId)
      .orderBy('id')
      .then(function (taskFiles) {
        resolve(taskFiles)
      })
      .catch(function (err) {
        logger.error(err)
        reject(new InternalError())
      })
    })
  }

  isTaskFilenameUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'task_files_ndx_task_filename_unique')
  }

  getTaskFileDir (taskFile) {
    return path.join(this.taskFileBaseDir, taskFile.prefix)
  }

  getTaskFilePath (taskFile) {
    return path.join(this.getTaskFileDir(taskFile), taskFile.filename)
  }

  createTaskFile (taskId, filename) {
    return new Promise((resolve, reject) => {
      TaskFile
      .query()
      .insert({
        taskId: taskId,
        prefix: crypto.randomBytes(16).toString('hex'),
        filename: filename,
        createdAt: new Date()
      })
      .then((taskFile) => {
        resolve(taskFile)
      })
      .catch((err) => {
        if (this.isTaskFilenameUniqueConstraintViolation(err)) {
          reject(new DuplicateTaskFilenameError())
        } else {
          logger.error(err)
          reject(new InternalError())
        }
      })
    })
  }

  makeTaskFileDir (filepath) {
    return new Promise((resolve, reject) => {
      fs.mkdir(filepath, (err) => {
        if (err) {
          logger.error(err)
          reject(new InternalError())
        } else {
          resolve()
        }
      })
    })
  }

  moveTaskFile (path1, path2) {
    return new Promise((resolve, reject) => {
      fs.rename(path1, path2, (err) => {
        if (err) {
          logger.error(err)
          reject(new InternalError())
        } else {
          resolve()
        }
      })
    })
  }

  create (taskId, tempPath, newFilename) {
    return new Promise((resolve, reject) => {
      let taskFile = null
      this.createTaskFile(taskId, newFilename)
      .then((newTaskFile) => {
        taskFile = newTaskFile
        return this.makeTaskFileDir(this.getTaskFileDir(taskFile))
      })
      .then(() => {
        return this.moveTaskFile(tempPath, this.getTaskFilePath(taskFile))
      })
      .then(() => {
        EventController.push(new CreateTaskFileEvent(taskFile))
        resolve(taskFile)
      })
      .catch((err) => {
        reject(err)
      })
    })
  }

  deleteTaskFile (id, callback) {
    return new Promise((resolve, reject) => {
      TaskFile
      .query()
      .delete()
      .where('id', id)
      .returning('*')
      .then(function (taskFiles) {
        if (taskFiles.length === 1) {
          resolve(taskFiles[0])
        } else {
          reject(new TaskFileNotFoundError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        reject(new InternalError())
      })
    })
  }

  unlinkTaskFile (filepath) {
    return new Promise((resolve, reject) => {
      fs.unlink(filepath, (err) => {
        if (err) {
          logger.error(err)
          reject(new InternalError())
        } else {
          resolve()
        }
      })
    })
  }

  removeTaskFileDir (filepath) {
    return new Promise((resolve, reject) => {
      fs.rmdir(filepath, (err) => {
        if (err) {
          logger.error(err)
          reject(new InternalError())
        } else {
          resolve()
        }
      })
    })
  }

  delete (taskFile) {
    return new Promise((resolve, reject) => {
      let deletedTaskFile = null
      this.deleteTaskFile(taskFile.id)
      .then((taskFile) => {
        deletedTaskFile = taskFile
        return this.unlinkTaskFile(this.getTaskFilePath(deletedTaskFile))
      })
      .then(() => {
        return this.removeTaskFileDir(this.getTaskFileDir(deletedTaskFile))
      })
      .then(() => {
        EventController.push(new DeleteTaskFileEvent(deletedTaskFile))
        resolve(deletedTaskFile)
      })
      .catch((err) => {
        reject(err)
      })
    })
  }
}

module.exports = new TaskFileController()

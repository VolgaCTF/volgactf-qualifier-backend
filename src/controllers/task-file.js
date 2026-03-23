const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { S3Client, PutObjectCommand, CreateBucketCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')

const logger = require('../utils/logger')
const { InternalError, DuplicateTaskFilenameError, TaskFileNotFoundError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION } = require('../utils/constants')
const TaskFile = require('../models/task-file')

const EventController = require('./event')
const CreateTaskFileEvent = require('../events/create-task-file')
const DeleteTaskFileEvent = require('../events/delete-task-file')

class TaskFileController {
  constructor () {
    this.taskFileBaseDir = process.env.VOLGACTF_QUALIFIER_TASK_FILE_DIR

    if (this.isRemoteUploadEnabled()) {
      const s3Params = {
        region: process.env.AWS_REGION,
        forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }

      if (process.env.AWS_ENDPOINT) {
        s3Params['endpoint'] = process.env.AWS_ENDPOINT
      }

      this.s3Client = new S3Client(s3Params)
    }
  }

  isRemoteUploadEnabled() {
    return Object.hasOwn(process.env, 'AWS_REGION') &&
      process.env.AWS_REGION !== '' &&
      Object.hasOwn(process.env, 'AWS_ACCESS_KEY_ID') &&
      process.env.AWS_ACCESS_KEY_ID !== '' &&
      Object.hasOwn(process.env, 'AWS_SECRET_ACCESS_KEY') &&
      process.env.AWS_SECRET_ACCESS_KEY !== '' &&
      Object.hasOwn(process.env, 'VOLGACTF_QUALIFIER_REMOTE_FILESTORE_S3_BUCKET_NAME') &&
      process.env.VOLGACTF_QUALIFIER_REMOTE_FILESTORE_S3_BUCKET_NAME !== ''
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

  createTaskFile (taskId, filename, uploadRemote) {
    const that = this
    return new Promise(function (resolve, reject) {
      TaskFile
        .query()
        .insert({
          taskId,
          prefix: crypto.randomBytes(16).toString('hex'),
          filename,
          remote: that.isRemoteUploadEnabled() && uploadRemote,
          createdAt: new Date()
        })
        .then(function (taskFile) {
          resolve(taskFile)
        })
        .catch(function (err) {
          if (that.isTaskFilenameUniqueConstraintViolation(err)) {
            reject(new DuplicateTaskFilenameError())
          } else {
            logger.error(err)
            reject(new InternalError())
          }
        })
    })
  }

  makeTaskFileDir (filepath) {
    return new Promise(function (resolve, reject) {
      fs.mkdir(filepath, function (err) {
        if (err) {
          logger.error(err)
          reject(new InternalError())
        } else {
          resolve()
        }
      })
    })
  }

  copyTaskFile (path1, path2) {
    return new Promise(function (resolve, reject) {
      fs.copyFile(path1, path2, function (err) {
        if (err) {
          logger.error(err)
          reject(new InternalError())
        } else {
          resolve()
        }
      })
    })
  }

  uploadTaskFileLocal(tempPath, taskFile) {
    const that = this
    return new Promise(function (resolve, reject) {
      that
        .makeTaskFileDir(that.getTaskFileDir(taskFile))
        .then(function () {
          return that.copyTaskFile(tempPath, that.getTaskFilePath(taskFile))
        })
        .then(function () {
          resolve(taskFile)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  getTaskFileKey (taskFile) {
    return path.join(taskFile.prefix, taskFile.filename)
  }

  createBucketIfNotExists() {
    const that = this
    return new Promise(function (resolve, reject) {
      if (process.env.VOLGACTF_QUALIFIER_REMOTE_FILESTORE_S3_BUCKET_CREATE !== 'yes') {
        resolve()
      } else {
        const createCommand = new CreateBucketCommand({
          Bucket: process.env.VOLGACTF_QUALIFIER_REMOTE_FILESTORE_S3_BUCKET_NAME,
        })

        that.s3Client.send(createCommand)
          .then(function () {
            resolve()
          })
          .catch(function (err) {
            if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
              resolve()
            } else {
              reject(err)
            }
          })
      }
    })
  }

  uploadTaskFileRemote(tempPath, taskFile) {
    const that = this
    return new Promise(function (resolve, reject) {
      const fileStream = fs.createReadStream(tempPath)
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.VOLGACTF_QUALIFIER_REMOTE_FILESTORE_S3_BUCKET_NAME,
        ContentType: mime.lookup(tempPath) || 'application/octet-stream',
        Key: that.getTaskFileKey(taskFile),
        Body: fileStream,
      })

      that.createBucketIfNotExists()
        .then(function() {
          return that.s3Client.send(uploadCommand)
        })
        .then(function () {
          resolve(taskFile)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  create (taskId, tempPath, newFilename, uploadRemote) {
    const that = this
    return new Promise(function (resolve, reject) {
      that
        .createTaskFile(taskId, newFilename, uploadRemote)
        .then(function (newTaskFile) {
          if (newTaskFile.remote) {
            return that.uploadTaskFileRemote(tempPath, newTaskFile)
          } else {
            return that.uploadTaskFileLocal(tempPath, newTaskFile)
          }
        })
        .then(function (taskFile) {
          EventController.push(new CreateTaskFileEvent(taskFile))
          resolve(taskFile)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  deleteTaskFile (id) {
    return new Promise(function (resolve, reject) {
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
    return new Promise(function (resolve, reject) {
      fs.unlink(filepath, function (err) {
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
    return new Promise(function (resolve, reject) {
      fs.rmdir(filepath, function (err) {
        if (err) {
          logger.error(err)
          reject(new InternalError())
        } else {
          resolve()
        }
      })
    })
  }

  deleteTaskFileLocal(taskFile) {
    const that = this
    return new Promise(function (resolve, reject) {
      that.unlinkTaskFile(that.getTaskFilePath(taskFile))
        .then(function () {
          return that.removeTaskFileDir(that.getTaskFileDir(taskFile))
        })
        .then(function () {
          resolve(taskFile)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  deleteTaskFileRemote(taskFile) {
    const that = this
    return new Promise(function (resolve, reject) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.VOLGACTF_QUALIFIER_REMOTE_FILESTORE_S3_BUCKET_NAME,
        Key: that.getTaskFileKey(taskFile),
      })

      that.s3Client.send(deleteCommand)
        .then(function () {
          resolve(taskFile)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  delete (taskFile) {
    const that = this
    return new Promise(function (resolve, reject) {
      that
        .deleteTaskFile(taskFile.id)
        .then(function (deletedTaskFile) {
          if (deletedTaskFile.remote) {
            return that.deleteTaskFileRemote(deletedTaskFile)
          } else {
            return that.deleteTaskFileLocal(deletedTaskFile)
          }
        })
        .then(function (deletedTaskFile) {
          EventController.push(new DeleteTaskFileEvent(deletedTaskFile))
          resolve(deletedTaskFile)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }
}

module.exports = new TaskFileController()

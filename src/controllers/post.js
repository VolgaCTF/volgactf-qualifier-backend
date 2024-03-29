const Post = require('../models/post')
const logger = require('../utils/logger')
const { InternalError, DuplicatePostTitleError, PostNotFoundError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION } = require('../utils/constants')
const EventController = require('./event')
const CreatePostEvent = require('../events/create-post')
const UpdatePostEvent = require('../events/update-post')
const DeletePostEvent = require('../events/delete-post')

class PostController {
  static isPostTitleUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'posts_ndx_title_unique')
  }

  static create (title, description, callback) {
    const now = new Date()

    Post
      .query()
      .insert({
        title,
        description,
        createdAt: now,
        updatedAt: now
      })
      .then(function (post) {
        callback(null, post)
        EventController.push(new CreatePostEvent(post))
      })
      .catch(function (err) {
        if (PostController.isPostTitleUniqueConstraintViolation(err)) {
          callback(new DuplicatePostTitleError(), null)
        } else {
          logger.error(err)
          callback(new InternalError(), null)
        }
      })
  }

  static update (id, title, description, callback) {
    Post
      .query()
      .patchAndFetchById(id, {
        title,
        description,
        updatedAt: new Date()
      })
      .then(function (post) {
        callback(null, post)
        EventController.push(new UpdatePostEvent(post))
      })
      .catch(function (err) {
        if (PostController.isPostTitleUniqueConstraintViolation(err)) {
          callback(new DuplicatePostTitleError(), null)
        } else {
          logger.error(err)
          callback(new InternalError(), null)
        }
      })
  }

  static delete (id, callback) {
    Post
      .query()
      .delete()
      .where('id', id)
      .returning('*')
      .then(function (posts) {
        if (posts.length === 1) {
          callback(null)
          EventController.push(new DeletePostEvent(posts[0]))
        } else {
          callback(new PostNotFoundError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new PostNotFoundError())
      })
  }

  static fetch () {
    return new Promise(function (resolve, reject) {
      Post
        .query()
        .then(function (posts) {
          resolve(posts)
        })
        .catch(function (err) {
          logger.error(err)
          reject(err)
        })
    })
  }

  static index (callback) {
    Post
      .query()
      .then(function (posts) {
        callback(null, posts)
      })
      .catch(function (err) {
        logger.error(err)
        callback(err, null)
      })
  }

  static get (id, callback) {
    Post
      .query()
      .where('id', id)
      .first()
      .then(function (post) {
        if (post) {
          callback(null, post)
        } else {
          callback(new PostNotFoundError(), null)
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new PostNotFoundError(), null)
      })
  }
}

module.exports = PostController

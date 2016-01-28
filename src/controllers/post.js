import Post from '../models/post'
import logger from '../utils/logger'
import errors from '../utils/errors'
import publisher from '../utils/publisher'
import _ from 'underscore'
import BaseEvent from '../utils/events'

import postSerializer from '../serializers/post'


class CreatePostEvent extends BaseEvent {
  constructor(post) {
    super('createPost')
    let postData = postSerializer(post)
    this.data.supervisors = postData
    this.data.teams = postData
    this.data.guests = postData
  }
}


class UpdatePostEvent extends BaseEvent {
  constructor(post) {
    super('updatePost')
    let postData = postSerializer(post)
    this.data.supervisors = postData
    this.data.teams = postData
    this.data.guests = postData
  }
}


class RemovePostEvent extends BaseEvent {
  constructor(postId) {
    super('removePost')
    let postData = { id: postId }
    this.data.supervisors = postData
    this.data.teams = postData
    this.data.guests = postData
  }
}


class PostController {
  static create(title, description, callback) {
    Post.find({ title: title }).count((err, count) => {
      if (err) {
        logger.error(err)
        callback(new errors.InternalError(), null)
      } else {
        if (count > 0) {
          callback(new errors.DuplicatePostTitleError(), null)
        } else {
          let now = new Date()
          let post = new Post({
            title: title,
            description: description,
            createdAt: now,
            updatedAt: now
          })

          post.save((err, post) => {
            if (err) {
              logger.error(err)
              callback(new errors.InternalError(), null)
            } else {
              callback(null, post)
              publisher.publish('realtime', new CreatePostEvent(post))
            }
          })
        }
      }
    })
  }

  static update(id, title, description, callback) {
    PostController.get(id, (err, post) => {
      if (err) {
        callback(err, null)
      } else {
        Post.find({ title: title }).count((err, count) => {
          if (err) {
            logger.error(err)
            callback(new errors.InternalError(), null)
          } else {
            if (count > 0 && title !== post.title) {
              callback(new errors.DuplicatePostTitleError(), null)
            } else {
              post.title = title
              post.description = description
              post.updatedAt = new Date()
              post.save((err, post) => {
                if (err) {
                  logger.error(err)
                  callback(new errors.InternalError(), null)
                } else {
                  callback(null, post)
                  publisher.publish('realtime', new UpdatePostEvent(post))
                }
              })
            }
          }
        })
      }
    })
  }

  static remove(id, callback) {
    Post.remove({ _id: id }, (err) => {
      if (err) {
        callback(new errors.PostNotFoundError())
      } else {
        callback(null)
        publisher.publish('realtime', new RemovePostEvent(id))
      }
    })
  }

  static list(callback) {
    Post.find((err, posts) => {
      if (err) {
        logger.error(err)
        callback(new errors.InternalError(), null)
      } else {
        callback(null, posts)
      }
    })
  }

  static get(id, callback) {
    Post.findOne({ _id: id }, (err, post) => {
      if (err) {
        logger.error(err)
        callback(new errors.PostNotFoundError(), null)
      } else {
        if (post) {
          callback(null, post)
        } else {
          callback(new errors.PostNotFoundError(), null)
        }
      }
    })
  }
}


export default PostController

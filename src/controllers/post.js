import Post from '../models/post'
import logger from '../utils/logger'
import { InternalError, DuplicatePostTitleError, PostNotFoundError } from '../utils/errors'
import publish from '../utils/publisher'
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
    Post
      .query()
      .where('title', title)
      .first()
      .then((post) => {
        if (post) {
          callback(new DuplicatePostTitleError(), null)
        } else {
          let now = new Date()
          Post
            .query()
            .insert({
              title: title,
              description: description,
              createdAt: now,
              updatedAt: now
            })
            .then((post) => {
              callback(null, post)
              publish('realtime', new CreatePostEvent(post))
            })
            .catch((err) => {
              logger.error(err)
              callback(new InternalError(), null)
            })
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static update(id, title, description, callback) {
    Post
      .query()
      .where('id', id)
      .first()
      .then((post) => {
        if (post) {
          Post
            .query()
            .where('title', title)
            .first()
            .then((duplicatePost) => {
              if (duplicatePost && duplicatePost.id !== id) {
                callback(new DuplicatePostTitleError(), null)
              } else {
                Post
                  .query()
                  .patchAndFetchById(id, {
                    title: title,
                    description: description,
                    updatedAt: new Date()
                  })
                  .then((updatedPost) => {
                    callback(null, updatedPost)
                    publish('realtime', new UpdatePostEvent(updatedPost))
                  })
                  .catch((err) => {
                    logger.error(err)
                    callback(new InternalError(), null)
                  })
              }
            })
            .catch((err) => {
              logger.error(err)
              callback(new InternalError(), null)
            })
        } else {
          callback(new InternalError(), null)
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static remove(id, callback) {
    Post
      .query()
      .delete()
      .where('id', id)
      .then((numDeleted) => {
        if (numDeleted === 0) {
          callback(new PostNotFoundError())
        } else {
          callback(null)
          publish('realtime', new RemovePostEvent(id))
        }
      })
      .catch((err) => {
        callback(new PostNotFoundError())
      })
  }

  static list(callback) {
    Post
      .query()
      .then((posts) => {
        callback(null, posts)
      })
      .catch((err) => {
        logger.error(err)
        callback(err, null)
      })
  }

  static get(id, callback) {
    Post
      .query()
      .where('id', id)
      .first()
      .then((post) => {
        if (post) {
          callback(null, post)
        } else {
          callback(new PostNotFoundError(), null)
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new PostNotFoundError(), null)
      })
  }
}


export default PostController

Post = require '../models/post'
logger = require '../utils/logger'
errors = require '../utils/errors'
publisher = require '../utils/publisher'
_ = require 'underscore'


class PostController
    @serialize: (post) ->
        result =
            id: post._id
            title: post.title
            description: post.description
            createdAt: post.createdAt.getTime()
            updatedAt: post.updatedAt.getTime()

    @create: (title, description, callback) ->
        Post.find(title: title).count (err, count) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                if count > 0
                    callback new errors.DuplicatePostTitleError(), null
                else
                    now = new Date()
                    post = new Post
                        title: title
                        description: description
                        createdAt: now
                        updatedAt: now
                    post.save (err, post) ->
                        if err?
                            logger.error err
                            callback new errors.InternalError(), null
                        else
                            callback null, post

                            publishData =
                                name: 'createPost'
                                post: PostController.serialize post

                            publisher.publish 'realtime', publishData

    @update: (id, title, description, callback) ->
        PostController.get id, (err, post) ->
            if err?
                callback err, null
            else
                Post.find(title: title).count (err, count) ->
                    if err?
                        logger.error err
                        callback new errors.InternalError(), null
                    else
                        if count > 0 and title != post.title
                            callback new errors.DuplicatePostTitleError(), null
                        else
                            post.title = title
                            post.description = description
                            post.updatedAt = new Date()
                            post.save (err, post) ->
                                if err?
                                    logger.error err
                                    callback new errors.InternalError(), null
                                else
                                    callback null, post

                                    publishData =
                                        name: 'updatePost'
                                        post: PostController.serialize post

                                    publisher.publish 'realtime', publishData

    @remove: (id, callback) ->
        Post.remove _id: id, (err) ->
            if err?
                callback new errors.PostNotFoundError()
            else
                callback null
                publisher.publish 'realtime', { name: 'removePost', post: id: id }

    @list: (callback) ->
        Post.find (err, posts) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                callback null, posts

    @get: (id, callback) ->
        Post.findOne _id: id, (err, post) ->
            if err?
                logger.error err
                callback new errors.PostNotFoundError(), null
            else
                if post?
                    callback null, post
                else
                    callback new errors.PostNotFoundError(), null


module.exports = PostController

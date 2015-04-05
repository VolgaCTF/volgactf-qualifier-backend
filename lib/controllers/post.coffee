Post = require '../models/post'
logger = require '../utils/logger'
errors = require '../utils/errors'
publisher = require '../utils/publisher'


class PostController
    @create: (title, description, callback) ->
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
                    id: post._id
                    title: post.title
                    description: post.description
                    createdAt: post.createdAt.getTime()
                    updatedAt: post.updatedAt.getTime()

                publisher.publish 'realtime', publishData

    @update: (id, title, description, callback) ->
        PostController.get id, (err, post) ->
            if err?
                callback err, null
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

    @remove: (id, callback) ->
        Post.remove _id: id, (err) ->
            if err?
                callback new errors.PostNotFoundError()
            else
                callback null
                publisher.publish 'realtime', { name: 'removePost', id: id }

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

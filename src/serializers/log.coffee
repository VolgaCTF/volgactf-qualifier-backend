
module.exports = (log) ->
    result =
        id: log._id
        event: log.event
        createdAt: log.createdAt.getTime()
        data: log.data

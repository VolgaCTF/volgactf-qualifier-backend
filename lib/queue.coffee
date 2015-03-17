queue = require './utils/queue'
logger = require './utils/logger'
gm = require 'gm'
path = require 'path'


queue('createLogoQueue').process (job, done) ->
    newFilename = path.join process.env.LOGOS_DIR, "team-#{job.data.id}.png"
    gm(job.data.filename).write newFilename, (err) ->
        if err?
            logger.error err
            throw err
        else
            done()


queue('sendEmailQueue').process (job, done) ->
    logger.info job.data
    done()

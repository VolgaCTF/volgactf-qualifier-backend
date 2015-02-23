parser = require 'nomnom'
logger = require './utils/logger'
SupervisorController = require './controllers/supervisor'


parser.command('create_supervisor')
    .help 'Create supervisor user'
    .option 'username', {
        required: yes
        abbr: 'u'
        help: 'User name'
    }
    .option 'password', {
        required: yes
        abbr: 'p'
        help: 'Password'
    }
    .option 'rights', {
        required: yes,
        abbr: 'r'
        choices: ['admin', 'manager']
        help: 'Supervisor rights - admin or manager'
    }
    .callback (opts) ->
        supervisorOpts =
            username: opts.username
            password: opts.password
            rights: opts.rights
        SupervisorController.create supervisorOpts, (err, supervisor) ->
            if err?
                logger.error err
                process.exit 1
            else
                logger.info "Supervisor `#{supervisor.username}` has been created!"
                process.exit 0

parser.command('remove_supervisor')
    .help 'Remove supervisor user'
    .option 'username', {
        required: yes
        abbr: 'u'
        help: 'User name'
    }
    .callback (opts) ->
        SupervisorController.remove opts.username, (err) ->
            if err?
                logger.error err
                process.exit 1
            else
                logger.info "Supervisor `#{opts.username}` has been removed!"
                process.exit 0

module.exports.run = ->
    parser.parse()

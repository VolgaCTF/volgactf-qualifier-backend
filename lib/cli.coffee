parser = require 'nomnom'
logger = require './utils/logger'

SupervisorController = require './controllers/supervisor'
TeamController = require './controllers/team'
_ = require 'underscore'
async = require 'async'


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

parser.command('list_supervisors')
    .help 'List all supervisors'
    .callback (opts) ->
        SupervisorController.list (err, supervisors) ->
            if err?
                logger.error err
                process.exit 1
            else
                for supervisor in supervisors
                    logger.info "Supervisor ##{supervisor.id} `#{supervisor.username}` (#{supervisor.rights})"
                process.exit 0

parser.command('list_teams')
    .help 'List all teams'
    .callback (opts) ->
        TeamController.list (err, teams) ->
            if err?
                logger.error err
                process.exit 1
            else
                for team in teams
                    logger.info "Team `#{team.name}` <#{team.email}>"
                process.exit 0


parser.command('update_teams')
    .help 'Update team fields'
    .callback (opts) ->
        TeamController.list (err, teams) ->
            if err?
                logger.error err
                process.exit 1
            else
                saveTeam = (team, next) ->
                    team.disqualified = no
                    team.resetPasswordToken = null
                    team.save (err, team) ->
                        if err?
                            next err, null
                        else
                            next null, team

                async.mapLimit teams, 5, saveTeam, (err, results) ->
                    if err?
                        logger.error err
                        process.exit 1
                    else
                        logger.info 'Completed'
                        process.exit 0

module.exports.run = ->
    parser.parse()

parser = require 'nomnom'
logger = require './utils/logger'

SupervisorController = require './controllers/supervisor'
TeamController = require './controllers/team'
TeamTaskProgressController = require './controllers/team-task-progress'
TeamTaskProgress = require './models/team-task-progress'
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


parser.command('cleanup_scores')
    .help 'Cleanup scores'
    .callback (opts) ->
        TeamController.list (err, teams) ->
            if err?
                logger.error err
                process.exit 1
            else
                TeamTaskProgressController.list (err, teamTaskProgress) ->
                    if err?
                        logger.error err
                        process.exit 1
                    else
                        findDuplicateTeamScore = (team, next) ->
                            taskProgressEntries = _.where teamTaskProgress, teamId: team._id
                            countedTaskIds = []
                            idsToDelete = []

                            for taskProgress in taskProgressEntries
                                if not _.contains countedTaskIds, taskProgress.taskId
                                    countedTaskIds.push taskProgress.taskId
                                else
                                    idsToDelete.push taskProgress._id

                            next null, idsToDelete

                        async.mapLimit teams, 5, findDuplicateTeamScore, (err, results) ->
                            if err?
                                logger.error err
                                process.exit 1
                            else
                                duplicateEntryIds = _.union results
                                toRemoveCount = duplicateEntryIds.length

                                removeDuplicateEntry = (entryId, next) ->
                                    TeamTaskProgress.remove _id: entryId, (err) ->
                                        if err?
                                            logger.error err
                                            next err, null
                                        else
                                            next null, null

                                async.mapLimit toRemoveCount, 5, removeDuplicateEntry, (err, results) ->
                                    if err?
                                        logger.error err
                                        process.exit 1
                                    else
                                        logger.info "Removed #{toRemoveCount} entries"
                                        process.exit 0


module.exports.run = ->
    parser.parse()

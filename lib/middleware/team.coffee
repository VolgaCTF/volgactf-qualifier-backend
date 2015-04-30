TeamController = require '../controllers/team'
logger = require '../utils/logger'


module.exports.getTeam = (request, response, next) ->
    TeamController.get request.session.identityID, (err, team) ->
        if err?
            next err
        else
            request.team = team
            next()

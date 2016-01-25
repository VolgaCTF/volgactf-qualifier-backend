_ = require 'underscore'

module.exports = (team, options={}) ->
    defaultOptions =
        exposeEmail: no
    options = _.extend defaultOptions, options

    obj =
        id: team._id
        name: team.name
        country: team.country
        locality: team.locality
        institution: team.institution
        createdAt: team.createdAt.getTime()

    if options.exposeEmail
        obj.email = team.email
        obj.emailConfirmed = team.emailConfirmed

    obj

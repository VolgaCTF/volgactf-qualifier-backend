const _ = require('underscore')

module.exports = function (team, options = {}) {
  let defaultOptions = {
    exposeEmail: false
  }
  options = _.extend(defaultOptions, options)

  let obj = {
    id: team.id,
    name: team.name,
    countryId: team.countryId,
    locality: team.locality,
    institution: team.institution,
    createdAt: team.createdAt.getTime(),
    disqualified: team.disqualified
  }

  if (options.exposeEmail) {
    obj.email = team.email
    obj.emailConfirmed = team.emailConfirmed
  }

  return obj
}

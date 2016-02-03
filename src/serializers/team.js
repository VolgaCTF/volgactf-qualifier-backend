import _ from 'underscore'

export default function(team, options={}) {
  let defaultOptions = {
    exposeEmail: false
  }
  options = _.extend(defaultOptions, options)

  let obj = {
    id: team.id,
    name: team.name,
    country: team.country,
    locality: team.locality,
    institution: team.institution,
    createdAt: team.createdAt.getTime()
  }

  if (options.exposeEmail) {
    obj.email = team.email
    obj.emailConfirmed = team.emailConfirmed
  }

  return obj
}

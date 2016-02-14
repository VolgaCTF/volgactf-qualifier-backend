
exports.up = function (knex, Promise) {
  return knex.schema.createTable('teams', (table) => {
    table.increments('id').primary()
    table.string('name', 100).notNullable()
    table.string('email', 254).notNullable()
    table.dateTime('createdAt').notNullable()
    table.boolean('emailConfirmed').notNullable()
    table.string('passwordHash', 100).notNullable()
    table.string('country', 150).notNullable()
    table.string('locality', 150).notNullable()
    table.string('institution', 150).notNullable()
    table.boolean('disqualified').notNullable()
    table.unique(['name'], 'teams_ndx_name_unique')
  }).raw('CREATE UNIQUE INDEX teams_ndx_email_unique ON teams (LOWER(email))')
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('teams')
}

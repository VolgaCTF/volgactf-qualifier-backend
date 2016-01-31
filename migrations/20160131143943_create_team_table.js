
exports.up = function(knex, Promise) {
  return knex.schema.createTable('teams', (table) => {
    table.increments('id').primary()
    table.string('name', 100).unique().notNullable()
    table.string('email', 254).unique().notNullable()
    table.dateTime('createdAt').notNullable()
    table.boolean('emailConfirmed').notNullable()
    table.binary('emailConfirmationToken')
    table.string('passwordHash', 100).notNullable()
    table.string('country', 150).notNullable()
    table.string('locality', 150).notNullable()
    table.string('institution', 150).notNullable()
    table.boolean('disqualified', 150).notNullable()
    table.binary('resetPasswordToken').notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('teams')
}


exports.up = function(knex, Promise) {
  return knex.schema.createTable('supervisors', (table) => {
    table.increments('id').primary()
    table.string('username', 100).unique().notNullable()
    table.string('passwordHash', 100).notNullable()
    table.string('rights', 50).notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('supervisors')
}

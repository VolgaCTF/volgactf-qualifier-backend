
exports.up = function(knex, Promise) {
  return knex.schema.createTable('contests', (table) => {
    table.increments('id').primary()
    table.integer('state').notNullable()
    table.dateTime('startsAt').notNullable()
    table.dateTime('finishesAt').notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('contests')
}

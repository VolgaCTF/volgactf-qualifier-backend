
exports.up = function(knex, Promise) {
  return knex.schema.createTable('logs', (table) => {
    table.increments('id').primary()
    table.integer('event').notNullable()
    table.dateTime('createdAt').notNullable()
    table.json('data').notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('logs')
}

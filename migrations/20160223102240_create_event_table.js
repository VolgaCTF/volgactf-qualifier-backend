
exports.up = function (knex, Promise) {
  return knex.schema.createTable('events', (table) => {
    table.increments('id').primary()
    table.integer('type').notNullable()
    table.json('data').notNullable()
    table.dateTime('createdAt')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('events')
}

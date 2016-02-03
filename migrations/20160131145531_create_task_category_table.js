
exports.up = function(knex, Promise) {
  return knex.schema.createTable('task_categories', (table) => {
    table.increments('id').primary()
    table.string('title', 50).unique().notNullable()
    table.text('description').notNullable()
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('task_categories')
}


exports.up = function(knex, Promise) {
  return knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary()
    table.string('title', 100).unique().notNullable()
    table.text('description').notNullable()
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
    table.json('hints').notNullable()
    table.integer('value').notNullable()
    table.json('categories').notNullable()
    table.json('answers').notNullable()
    table.boolean('caseSensitive').notNullable()
    table.integer('state').notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('tasks')
}

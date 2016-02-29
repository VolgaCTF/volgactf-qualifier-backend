
exports.up = function (knex, Promise) {
  return knex.schema.createTable('categories', (table) => {
    table.increments('id').primary()
    table.string('title', 50).notNullable()
    table.text('description').notNullable()
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
  }).raw('CREATE UNIQUE INDEX categories_ndx_title_unique ON categories (LOWER(title))')
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('categories')
}

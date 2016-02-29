
exports.up = function (knex, Promise) {
  return knex.schema.createTable('posts', (table) => {
    table.increments('id').primary()
    table.string('title', 140).notNullable()
    table.text('description').notNullable()
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
    table.unique(['title'], 'posts_ndx_title_unique')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('posts')
}

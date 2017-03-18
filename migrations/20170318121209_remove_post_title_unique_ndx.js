
exports.up = function(knex, Promise) {
  return knex.schema.alterTable('posts', (table) => {
    table.dropUnique(['title'], 'posts_ndx_title_unique')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.alterTable('posts', (table) => {
    table.unique(['title'], 'posts_ndx_title_unique')
  })
}

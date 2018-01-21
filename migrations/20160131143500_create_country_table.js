
exports.up = function (knex, Promise) {
  return knex.schema.createTable('countries', (table) => {
    table.increments('id').primary()
    table.string('code', 5).notNullable()
    table.string('name', 100).notNullable()
    table.unique(['code'], 'countries_ndx_code_unique')
    table.unique(['name'], 'countries_ndx_name_unique')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('countries')
}

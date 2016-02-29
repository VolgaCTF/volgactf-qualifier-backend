
exports.up = function (knex, Promise) {
  return knex.schema.createTable('countries', (table) => {
    table.increments('id').primary()
    table.string('name', 100).notNullable()
    table.string('formalName', 300).notNullable()
    table.unique(['name'], 'countries_ndx_name_unique')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('countries')
}

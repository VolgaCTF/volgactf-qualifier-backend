const Knex = require('knex')

module.exports = Knex({
  client: 'postgresql',
  connection: {
    database: process.env.POSTGRES_DBNAME,
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT, 10),
    user: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD
  },
  pool: {
    min: 2,
    max: 10
  }
})

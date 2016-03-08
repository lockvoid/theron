module.exports = exports.default = {
  development: {
    client: 'postgresql',

    connection: 'postgres://localhost/theron_development',

    migrations: {
      tableName: 'migrations'
    }
  },

  production: {
    client: 'postgresql',

    connection: process.env['POSTGRES_URL'],

    migrations: {
      tableName: 'migrations'
    }
  }
}

module.exports = exports.default = {
  development: {
    client: 'postgresql',

    connection: 'postgres://localhost/theron_development',

    migrations: {
      tableName: 'migrations'
    }
  }
}

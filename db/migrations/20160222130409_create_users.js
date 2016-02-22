exports.up = (knex) => {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('email').unique();
    table.string('encrypted_password');
    table.string('name');
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable('users');
};

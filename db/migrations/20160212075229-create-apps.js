const async = require('async');
const indexName = require('../index');

exports.up = function(db, callback) {
  async.series([
    db.createTable.bind(db, 'apps', { id: { type: 'int', primaryKey: true }, name: { type: 'string', notNull: true }, secret: { type: 'string', notNull: true }, db: 'string' }),
    db.addIndex.bind(db, 'apps', indexName('apps', ['name']), 'name', true),
    db.addIndex.bind(db, 'apps', indexName('apps', ['secret']), 'secret', true),
  ], callback);
};

exports.down = function(db, callback) {
  db.dropTable('apps', callback);
};

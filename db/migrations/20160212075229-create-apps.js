'use strict';

const async = require('async');
const indexName = require('../index');

exports.up = function(db, callback) {
  async.series([
    db.createTable.bind(db, 'apps', {
      id: {
        type: 'int', primaryKey: true, autoIncrement: true,
      },

      name: {
        type: 'string', notNull: true,
      },

      secret: {
        type: 'string', notNull: true,
      },

      db: {
        type: 'string'
      }
    }),
  ], callback);
};

exports.down = function(db, callback) {
  db.dropTable('apps', callback);
};

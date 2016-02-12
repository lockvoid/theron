'use strict';

const async = require('async');
const indexName = require('../index');

exports.up = function(db, callback) {
  async.series([
    db.createTable.bind(db, 'queries', {
      id: {
        type: 'int', primaryKey: true, autoIncrement: true,
      },

      app_id: {
        type: 'int', notNull: true,
      },

      name: {
        type: 'string', notNull: true,
      },

      callback: {
        type: 'text', notNull: true,
      }
    }),

    db.addIndex.bind(db, 'queries', indexName('queries', ['app_id', 'name']), ['app_id', 'name'], true),
  ], callback);
};

exports.down = function(db, callback) {
  db.dropTable('queries', callback);
};

import * as knex from 'knex';
import * as bookshelf from 'bookshelf';

const config = require('../../../../db/config');

export const Database = bookshelf(knex(config[process.env.NODE_ENV || 'development']));

Database.plugin('virtuals');

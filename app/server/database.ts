import { Model } from 'objection';
import * as knex from 'knex';

const config = require('../../../../db/config');

Model.knex(knex(config[process.env.NODE_ENV || 'development']));

// remove

import * as bookshelf from 'bookshelf';
export const Database = bookshelf(knex(config[process.env.NODE_ENV || 'development']));


Database.plugin('virtuals');

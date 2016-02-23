import * as knex from 'knex';
import * as pg from 'pg';
import * as qs from 'qs';
import * as url from 'url';

import { AppRecord } from '../models/app';

export const verifyClient = async ({ origin, req, secure }, valid) => {
  let name = qs.parse(url.parse(req.url).query).app;

  try {
    let app = await new AppRecord().where('name', name).fetch();

    if (!app) {
      return valid(false, 404, `App not found`);
    }
    if (!app.get('db_url')) {
      return valid(false, 400, 'Database not specified');
    }

    pg.connect(app.get('db_url'), (err, db) => {
      if (err) {
        return valid(false, 400, err.toString());
      }

      db.query('LISTEN theron_watchers', (err) => {
        if (err) {
          return valid(false, 400, err.toString());
        }

        Object.assign(req, { app: app.attrubutes, db });

        valid(true);
      });
    });
  } catch (error) {
    valid(false, 500);
  }
}

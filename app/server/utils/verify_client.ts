import * as knex from 'knex';
import * as qs from 'qs';
import * as url from 'url';
import { Observable } from 'rxjs/Observable';

const pg = require('pg-promise')();

import { AppRecord } from '../models/app';

export const verifyClient = async ({ origin, req, secure }, valid) => {
  let name = qs.parse(url.parse(req.url).query).app;

  try {
    let app = await AppRecord.query().where('name', name).first();

    if (!app) {
      return valid(false, 404, `App not found`);
    }

    if (!app.db_url) {
      return valid(false, 400, 'Database not specified');
    }

    const db = pg(app.db_url);
    await db.query('SELECT 1');

    let notifier = new Observable<any>(observer => {
      var persistent = new pg.pg.Client(app.db_url);

      persistent.connect();
      persistent.query('LISTEN theron_watchers');

      persistent.on('notification', message => {
        observer.next(message);
      });

      return () => {
        persistent.query('UNLISTEN theron_watchers');
        persistent.end();
      }
    });

    Object.assign(req, { app: app, db, notifier });

    valid(true);
  } catch (error) {
    valid(false, 500);
  }
}

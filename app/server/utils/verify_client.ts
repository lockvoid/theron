import * as knex from 'knex';
import * as qs from 'qs';
import * as url from 'url';
import { Observable } from 'rxjs/Observable';

const pg = require('pg-then');

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

    const db = pg.Pool(app.get('db_url'))

    let notifier = new Observable<any>(observer => {
      const persistent = pg.Client(app.get('db_url'));

      persistent.query('LISTEN theron_watchers');

      persistent._client.on('notification', message => {
        observer.next(message);
      });

      return () => {
        persistent.query('UNLISTEN theron_watchers').then(() => {
          persistent.end();
        });
      }
    });

    Object.assign(req, { app: app.attributes, db, notifier });

    valid(true);
  } catch (error) {
    valid(false, 500);
  }
}

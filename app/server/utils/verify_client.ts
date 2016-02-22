import * as knex from 'knex';
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

    try {
      const db = knex({ client: 'pg', connection: app.get('db_url') });
      await db.raw('LISTEN theron_watchers');

      Object.assign(req, { app: app.attrubutes, db });

      valid(true);
    } catch (error) {
      valid(false, 400, 'Connection is unreachable');
    }
  } catch (error) {
    valid(false, 500);
  }
}

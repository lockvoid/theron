import * as ws from 'ws';
import * as pg from 'pg';
import * as sql from 'sql-bricks-postgres';

import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/subject/ReplaySubject';
import { Subscriber } from 'rxjs/Subscriber';

import { PARSE_ERROR, UPSERT_QUERY, REMOVE_QUERY, SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, QUERY_VALID, QUERY_INVALID } from '../../lib/constants';
import { TheronBaseAction } from '../../lib/actions';
import { verifyClient } from './utils/verify_client';


 console.log(sql.insert('queries', { app_id: 1, name: 'name', callback: 'callback' }).toString());
export const app = (httpServer) => {
  const wsServer = new ws.Server({ server: httpServer, path: '/echo', verifyClient });

  wsServer.on('connection', ws => {
    let { appId, appName, appAdmin, db, dbClose } = <{ appId: number, appName: string, appAdmin: boolean, db: pg.Client, dbClose: Function }>(<any>ws.upgradeReq);

    db.on('notification', message => {
      console.log(message);
    });

    db.query('LISTEN watchers');

    ws.on('close', () => {
      dbClose();
    });

    ws.on('message', (message) => {
      try {
        var action = JSON.parse(message);
      } catch(err) {
        return console.log(message);
      }

      switch (action.type) {
        case SUBSCRIBE_QUERY:
          return ws.send(JSON.stringify({ type: QUERY_VALID, subscriptionKey: action.subscriptionKey, queryKey: 'queryKey' }));
        case UNSUBSCRIBE_QUERY:
          return ws.send(JSON.stringify({ type: QUERY_VALID, subscriptionKey: action.subscriptionKey, queryKey: 'queryKey' }));
      }

      if (appAdmin) {
        switch (action.type) {
          case UPSERT_QUERY:
            return upsertQuery(appId, action.name, action.callback);
          case REMOVE_QUERY:
            return removeQuery(appId, action.name);
       }
      } else {

      }
    });
  });
}

const upsertQuery = (appId: number, queryName: string, callback: Function) => {
  pg.connect(process.env['POSTGRES_URL'], (err, db, close) => {
    let text = `INSERT INTO queries(app_id, name, callback) VALUES($1, $2, $3) ON CONFLICT(app_id, name) DO update SET callback = $3`;

    db.query({ text, values: [appId, queryName, callback] }, err => {
      close();
    });
  });
}

const removeQuery = (appId: number, queryName: string) => {
  pg.connect(process.env['POSTGRES_URL'], (err, db, close) => {
    db.query(sql.delete().from('queries').where({ app_id: appId, name: queryName }).toString(), err => {
      close();
    });
  });
}

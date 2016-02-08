import * as r from 'rethinkdb';
import * as ws from 'ws';

import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/subject/ReplaySubject';
import { Subscriber } from 'rxjs/Subscriber';

import { verifyClient } from './utils/verify_client';

export const app = (httpServer) => {
  const wsServer = new ws.Server({ server: httpServer, path: '/echo', verifyClient });

  wsServer.on('connection', ws => {
    let { db } = <any>ws.upgradeReq;

    ws.on('close', () => {
      db.close();
    });
  });
}


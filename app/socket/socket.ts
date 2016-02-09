import * as r from 'rethinkdb';
import * as ws from 'ws';

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


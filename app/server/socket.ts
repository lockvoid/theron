import * as ws from 'ws';
import * as pg from 'pg';

import { Router } from './router';
import { verifyClient } from './utils/verify_client';

export const app = async (httpServer) => {
  const socketServer = new ws.Server({ server: httpServer, path: '/echo', verifyClient });

  socketServer.on('connection', (socket) => {
    let { db, app, notifier } = <any>socket.upgradeReq;

    const router = new Router(socket, app, db, notifier);

    router.subscribe(
      message => {
        console.log(`Message: ${JSON.stringify(message)}`);
      },

      error => {
      },

      () => {
      }
    );
  });
}

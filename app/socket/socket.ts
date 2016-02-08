'use strict';

import * as ws from 'ws';

export const app = (httpServer) => {
  const wsServer = new ws.Server({ server: httpServer, path: '/echo' });

  wsServer.on('connection', ws => {
    console.log('Socket connection established');
  });
}

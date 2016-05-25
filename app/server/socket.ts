import * as WebSocket from 'ws';

import { PingWebSocket } from './lib/core/ping_websocket';
import { RequestReducer } from './lib/core/request_reducer';
import { ResponseReducer } from './lib/core/response_reducer';

const responses = new ResponseReducer();

export const app = async (httpServer) => {
  const socketServer = new WebSocket.Server({ server: httpServer });

  socketServer.on('connection', socket => {
    const pingSocket = new PingWebSocket(socket);

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`----> Session (${pingSocket.objectId}) is opened`);

      pingSocket.subscribe(
        message => {
          console.log(`<---- Message: ${JSON.stringify(message)}`);
        },

        err => {
          console.log(`----> Error: ${JSON.stringify({ code: err.code, reason: err.reason})}`);
        },

        () => {
          console.log(`----> Session (${pingSocket.objectId}) is closed`);
        }
      );
    }

    // Waiting for each new request to proceed before merging the next.

    const requests = pingSocket.enqueue(new RequestReducer().next);

    // Then broadcast across the connected clients.

    requests.subscribe(responses);
  });
}

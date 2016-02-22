'use strict';

const http = require('http');

// Import internal modules

const server = require('../dist/server/app/server/server');
const socket = require('../dist/server/app/server/socket');

// Bootstrap internal services

const httpServer = http.createServer(server.app)
const serverPort = process.env.PORT || 9090;

socket.app(httpServer);

httpServer.listen(serverPort, () => {
  console.log(`Server listening on: http://0.0.0.0:${serverPort}`);
});

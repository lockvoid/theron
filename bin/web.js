'use strict';

const http = require('http');
const os = require('os');
const throng = require('throng');

function start(id) {
  // Import

  require('../dist/server/app/server/config/objection');

  const server = require('../dist/server/app/server/server');
  const socket = require('../dist/server/app/server/socket');

  // Bootstrap

  const httpServer = http.createServer(server.app)
  const PORT = process.env.PORT || 9090;

  socket.app(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server ${id} is listening on: http://0.0.0.0:${PORT}`);
  });
}

const WORKERS = process.env.NODE_ENV === 'production' ? process.env.WEB_CONCURRENCY : os.cpus().length;

throng({ start, workers: WORKERS, lifetime: Infinity });

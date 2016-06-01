'use strict';

const { createServer } = require('http');

const throng = require('throng');
const config = require('./config');

function start(id) {
  require('../dist/server/app/server/config');

  const server = require('../dist/server/app/server/server');
  const socket = require('../dist/server/app/server/socket');

  const http = createServer(server.app);
  const teardown = socket.up(http);

  http.listen(process.env.PORT || 9090, () => {
    console.log(`Server ${id} is listening on: http://0.0.0.0:${process.env.PORT || 9090}`);
  });

  process.on('SIGTERM', () => {
    console.log(`Server ${id} is exiting...`);

    teardown.unsubscribe();
    setTimeout(process.exit, config.EXIT_TIMEOUT);
  });
}

throng({ start, workers: config.SERVER_WORKERS, lifetime: Infinity });

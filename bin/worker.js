'use strict';

const throng = require('throng');
const config = require('./config');

function start(id) {
  require('../dist/server/app/server/config');
  require('../dist/server/app/server/jobs');

  process.on('SIGTERM', () => {
    console.log(`Worker ${id} is exiting...`);
    setTimeout(process.exit, config.EXIT_TIMEOUT);
  });

  console.log(`Worker ${id} is started`);
}

throng({ start, workers: config.WORKER_WORKERS, lifetime: Infinity });

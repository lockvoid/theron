'use strict';

const throng = require('throng');
const config = require('./config');

function start(id) {
  require('../dist/server/app/server/config');

  const differ = require('../dist/server/app/server/differ');

  const teardown = differ.up(id);

  process.on('SIGTERM', () => {
    console.log(`Differ ${id} is exiting...`);

    teardown.unsubscribe();
    setTimeout(process.exit, config.EXIT_TIMEOUT);
  });

  console.log(`Differ ${id} is started`);
}

throng({ start, workers: config.DIFFER_WORKERS, lifetime: Infinity });

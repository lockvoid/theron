const os = require('os');

const SYSTEM_WORKERS = process.env.NODE_ENV === 'production' ? (process.env.WEB_CONCURRENCY || os.cpus().length) : 1;
const SERVER_WORKERS = SYSTEM_WORKERS;
const WORKER_WORKERS = SYSTEM_WORKERS;
const DIFFER_WORKERS = 1 || SYSTEM_WORKERS;

const EXIT_TIMEOUT = 3000;

module.exports = { SYSTEM_WORKERS, SERVER_WORKERS, WORKER_WORKERS, DIFFER_WORKERS, EXIT_TIMEOUT }

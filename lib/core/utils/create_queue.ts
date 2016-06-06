import * as bull from 'bull';
import * as url from 'url';

import { logError } from './log_error'

const { port, hostname, auth } = url.parse(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export function createQueue(id: string) {
  const queue = bull(id, parseInt(port), hostname, { auth_pass: String(auth).split(':')[1] });

  queue.on('failed', (job, err) => {
    logError(err);
  });

  return queue;
}

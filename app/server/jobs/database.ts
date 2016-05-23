import { databaseQueue } from '../config/bull';

databaseQueue.process(async (job) => {
  console.log('work done');
});

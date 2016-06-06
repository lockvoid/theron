import { DifferExecutor } from '../../../lib/core/differ_executor';
import { createQueue } from '../../../lib/core/utils/create_queue';

createQueue('executor').process(async (job) => {
  const { app, query, channel, session } = <any>job.data;

  return new DifferExecutor(app, query, { channel, session }).execute();
});



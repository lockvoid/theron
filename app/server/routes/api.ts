import { Router } from 'express';

import { Theron } from '../../../lib/driver/driver';
import { AppRecord } from '../models/app';

const apps = Router();

apps.get('/', (req, res) => {
  let queryText = AppRecord.collection().query(q => q.orderBy(req.query.order)).query().toString();
  let querySignature = Theron.sign(queryText, '12345');

  res.json({ queryText, querySignature });
});

export const api = Router();

api.use('/apps', apps);

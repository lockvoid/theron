import { Router } from 'express';

import { AppRecord } from '../models/app';

const apps = Router();

apps.get('/', (req, res) => {
  let queryText = AppRecord.collection().query(q => q.orderBy(req.query.order)).query().toString();

  res.json({ queryText });
});

export const api = Router();

api.use('/apps', apps);

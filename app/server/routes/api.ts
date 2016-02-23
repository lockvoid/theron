import { Router } from 'express';

import { AppRecord } from '../models/app';

const apps = Router();

apps.get('/', (req, res) => {
  let query = AppRecord.collection().query(q => q.orderBy(req.query.order, 'desc')).query().toString();

  res.json({ query });
});

export const api = Router();

api.use('/apps', apps);

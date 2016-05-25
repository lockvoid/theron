import * as express from 'express';

import { Theron } from '../../../lib/driver/theron';
import { UserRecord, AppRecord } from '../models';
import { AuthError, NotFoundError } from '../lib/errors';
import { wrap, signUser, createNotifier } from '../utils';

export const api = express.Router();

api.post('/tokens', wrap(async ({ body }, res, next) => {
  const user = await UserRecord.auth(body.email, body.password);

  if (!user) {
    return next(new AuthError(403, 'Wrong email or password'));
  }

  res.json({ token: signUser(user) });
}));

api.post('/users', wrap(async ({ body }, res, next) => {
  const user = await UserRecord.query().insert(body);

  res.json({ id: user.id });
}));

api.get('/users/email/:email/uniqueness', wrap(async ({ params, query }, res, next) => {
  const { count } = await UserRecord.query().where('email', params.email).whereNot('id', query.id).count('id').first();

  res.json(parseInt(count) === 0);
}));

// Protected area

api.use((req, res, next) => {
  if (req.currentUser) {
    return next();
  }

  next(new AuthError(401, 'Failed to authenticate token'));
});

api.post('/apps', wrap(async ({ currentUser, body }, res, next) => {
  const app = await currentUser.$relatedQuery('apps').insert(body);

  res.json({ id: app.id });
}));

api.patch('/apps/:appId', wrap(async ({ currentUser, params, body }, res, next) => {
  const app = await currentUser.$relatedQuery('apps').findById(params.appId);

  if (!app) {
    return next(new NotFoundError(404, 'App not found'));
  }

  if (body.db_url) {
    await createNotifier(body.db_url);
  }

  await currentUser.$relatedQuery('apps').patchAndFetchById(params.appId, body);

  res.json({});
}));

api.delete('/apps/:appId', wrap(async ({ currentUser, params, body }, res, next) => {
  const app = await currentUser.$relatedQuery('apps').delete().where('id', params.appId);

  res.json({});
}));

api.get('/apps', ({ currentUser, query }, res) => {
  const queryText = currentUser.$relatedQuery('apps').orderBy(query.orderBy).toString();
  const querySignature = Theron.sign(queryText, process.env['THERON_SECRET']);

  res.json({ queryText, querySignature });
});

api.get('/apps/name/:name/uniqueness', wrap(async ({ params, query }, res, next) => {
  const { count } = await AppRecord.query().where('name', params.name).whereNot('id', query.id).count('id').first();

  res.json(parseInt(count) === 0);
}));

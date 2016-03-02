import * as express from 'express';

import { Theron } from '../../../lib/driver/driver';
import { AppRecord } from '../models/app';
import { UserRecord } from '../models/user';
import { AuthError } from '../auth_error';
import { wrap } from '../wrap_async';
import { signUser } from '../utils/sign_user';

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

  res.json({});
}));

api.get('/users/email/:email/validate', wrap(async ({ params }, res, next) => {
  const { count } = await UserRecord.query().where('email', params.email).count('id').first();

  res.json(parseInt(count) === 0);
}));

// Protected area

api.use((req, res, next) => {
  if (req.currentUser) {
    return next();
  }

  next(new AuthError(401, 'Failed to authenticate token'));
});

api.get('/apps', ({ currentUser, query }, res) => {
  const queryText = currentUser.$relatedQuery('apps').orderBy(query.order).toString();
  const querySignature = Theron.sign(queryText, process.env['THERON_SECRET']);

  res.json({ queryText, querySignature });
});

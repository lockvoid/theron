import * as jwt from 'jsonwebtoken';
import * as express from 'express';

import { Theron } from '../../../lib/driver/driver';
import { AppRecord } from '../models/app';
import { UserRecord } from '../models/user';
import { AuthError } from '../auth_error';
import { wrap } from '../wrap_async';

export const api = express.Router();

api.post('/auth', wrap(async (req, res, next) => {
  let user = await UserRecord.auth(req.body.email, req.body.password);

  if (!user) {
    return next(new AuthError(403, 'Wrong email or password'));
  }

  res.json({ token: jwt.sign({ userId: user.id }, process.env['JWT_SECRET'], { expiresIn: '30d' }) });
}));

// Protected area

api.use((req, res, next) => {
  if (req.currentUser) {
    return next();
  }

  next(new AuthError(401, 'Failed to authenticate token'));
});

api.get('/apps', ({ currentUser, query }, res) => {
  let queryText = currentUser.$relatedQuery('apps').orderBy(query.order).toString();
  let querySignature = Theron.sign(queryText, process.env['THERON_SECRET']);

  res.json({ queryText, querySignature });
});

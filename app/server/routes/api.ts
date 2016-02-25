import * as jwt from 'jsonwebtoken';
import * as express from 'express';

import { Theron } from '../../../lib/driver/driver';
import { AppRecord } from '../models/app';
import { UserRecord } from '../models/user';
import { AuthError } from '../auth_error';
import { wrap } from '../wrap_async';

export const api = express.Router();

api.post('/auth', wrap(async (req, res) => {
  let user = await UserRecord.auth(req.body.email, req.body.password);

  try {
    if (!user) {
      throw new AuthError(400, 'Authentication failed. Wrong email or password.');
    }

    let token = jwt.sign({ userId: user.get('id') }, process.env['JWT_SECRET'], { expiresIn: '30d' });
    res.json({ token });
  } catch (e) {
    if (e instanceof AuthError){
      res.status(e.code).json({ reason: e.message });
    } else {
      throw e;
    }
  }
}));

api.use((req, res, next) => {
  if (req.currentUser) {
    return next();
  }

  res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
});

api.get('/apps', ({ currentUser }, res) => {
  // let queryText = AppRecord.collection().query(q => q.orderBy(req.query.order)).query().toString();
  // let querySignature = Theron.sign(queryText, '12345');

  // res.json({ queryText, querySignature });
});

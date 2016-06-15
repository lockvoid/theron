'use strict';

import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import * as pg from 'pg';
import * as request from 'request';
import * as React from 'react';
import * as ReactDOM from 'react-dom/server';

export const app = express();

import { ValidationError } from 'objection';
import { UserRecord } from './models';
import { BaseError } from '../../lib/errors/base_error';
import { wrap } from './utils/wrap_async';
import { api } from './routes/api';

// Parse params

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Parse cookies

app.use(cookieParser())

// JWT-based auth

app.use(wrap(async (req, res, next) => {
  const token = req.body.token || req.query.token || req.headers['X-JWT-Token'.toLowerCase()];

  if (token) {
    try {
      const auth = jwt.verify(token, process.env['JWT_SECRET']);

      req.currentUser = await UserRecord.query().where('id', auth.userId).first();
    } catch(error) {
      if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
        return next(error);
      }
    }
  }

  next();
}));

// Configure views

app.engine('js', (filename: string, options: any, done: Function) => {
  var markup = '<!DOCTYPE html>';

  try {
    const component = require(filename).default;

    markup += ReactDOM.renderToStaticMarkup(React.createElement(component, options));
  } catch (e) {
    return done(e);
  }

  done(null, markup);
});

app.set('views', `${__dirname}/views`);
app.set('view engine', 'js');

// Serve assets

app.use('/assets', express.static('./dist/public'));
app.use('/bundles', express.static('./dist/driver'));

app.use((req, res, next) => {
  req.path.indexOf("/assets") === 0 ? res.status(404).send(`Cannot GET ${req.path}`) : next();
});

if (app.get('env') === 'development') {
  app.use('/', express.static('./dist/client'));

  app.use('/jspm_packages', express.static('./jspm_packages'));

  app.get('/config.js', (req, res) => {
    res.sendFile(`${process.cwd()}/config.js`);
  });
}

// Mount routes

app.use('/api', api);

// Error handler

app.use(<express.ErrorRequestHandler>((err, req, res, next) => {
  if (err instanceof BaseError) {
    return res.status(err.code).json({ reason: err.message });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({ reason: JSON.parse(err.message) });
  }

  next(err);
}));

// Proxy static pages

app.get('/:path(static|docs|blog)+*', (req, res) => {
  request(`${process.env['STATIC_URL']}${req.path}`).on('error', (err) => res.send('Server error')).pipe(res);
});

// Render pages

app.get('/home', (req, res) => {
  request(process.env['STATIC_URL']).on('error', (err) => res.send('Server error')).pipe(res);
});

app.get('/', (req, res) => {
  if (req.cookies.theronAuth === 'true') {
    res.render('app');
  } else {
    request(process.env['STATIC_URL']).on('error', (err) => res.send('Server error')).pipe(res);
  }
});

app.get('/*', (req, res) => {
  res.render('app');
});

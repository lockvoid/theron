'use strict';

import * as express from 'express';

export const app = express();

// Serve assets

app.use('/assets', express.static('./dist/public'));

app.use((req, res, next) => {
  req.path.indexOf("/assets") === 0 ? res.status(404).send(`Cannot GET ${req.path}`) : next();
});

if (app.get('env') === 'development') {
  app.use('/', express.static('./dist/client'));
  app.use('/', express.static('./dist/driver'));

  // Serve playground

  app.use('/playground', express.static('./dist/driver/test/playground'));
  app.use('/playground', express.static('./test/playground'));

  // Serve packages

  app.use('/node_modules', express.static('./node_modules'));
  app.use('/jspm_packages', express.static('./jspm_packages'));

  app.get('/config.js', (req, res) => {
    res.sendFile(`${process.cwd()}/config.js`);
  });
}

app.get('/', (req, res) => {
  res.send('hello, world!');
});

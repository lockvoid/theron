/* @ifdef NODE_BUILD */


declare module NodeJS  {
  interface Global {
    fetch: Function;
  }
}

global.fetch = require('node-fetch');

/* @endif */

/* @ifndef NODE_BUILD */

import 'whatwg-fetch';

/* @endif */


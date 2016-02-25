/* @ifdef NODE */


declare module NodeJS  {
  interface Global {
    fetch: Function;
  }
}

global.fetch = require('node-fetch');

/* @endif */

/* @ifndef NODE */

import 'whatwg-fetch';

/* @endif */


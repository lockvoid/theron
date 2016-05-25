const { Client } = require('raygun');

if (process.env.RAYGUN_KEY) {
  var raygun = new Client().init({ apiKey: process.env.RAYGUN_KEY });
}

export function logError(err) {
  try {
    raygun ? raygun.send(err, {}) : console.error(err);
  } catch (raygun) {
    console.error(raygun);
    console.error(err);
  }
}

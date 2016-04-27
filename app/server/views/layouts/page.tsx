import * as React from 'react';

import { assetPath } from '../../utils/asset_path';
import { Metrika } from '../shared/metrika';

export const Page = ({ title = null, children = null, className = null }) => (
  <html>
    <head>
      <title>{title && `${title} - `}Theron</title>

      <base href="/" />

      <meta name="description" content="Reactive storage for realtime applications. Theron instantly streams data across clients, so you can focus on creating an extraordinary experience for your users." />
      <meta name="keywords" content="realtime, reactive, websockets, angular, react, ember, rxjs, browser, mobile, instant updates, push notifications, automatic scaling, free sign up" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <link rel="stylesheet" media="screen" href={assetPath('app.css')} />

      /* @ifdef METRIKA_APP */ <Metrika app={/* @echo METRIKA_APP */} /> /* @endif */
    </head>

    <body className={className}>
      {children}
    </body>
  </html>
);

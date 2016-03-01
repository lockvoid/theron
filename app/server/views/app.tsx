import * as React from 'react';

import { Page } from './layouts/page';
import { AppSpinner } from '../../../lib/components/app_spinner';

const Boot = () => (
  <div style={{ position: 'absolute', top: -9999 }}>
    <script src="/jspm_packages/system.js" />
    <script src="/config.js" />

    <script dangerouslySetInnerHTML={{ __html: `
      System.import('babel-polyfill'); System.import('/app/client/main').catch(console.log.bind(console))
    ` }} />,
  </div>
);

export default () => (
  <Page className='app'>
    <app id="app"><AppSpinner /></app>
    <Boot />
  </Page>
);

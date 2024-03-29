import * as React from 'react';

import { Page } from './layouts/page';
import { AppSpinner } from '../../../lib/components/app_spinner';
import { assetPath } from '../utils/asset_path';

const Boot = () => {
  if (process.env.NODE_ENV === 'production') {
    return <script src={assetPath('app.js')} />
  }

  return (
    <div style={{ position: 'absolute', top: -9999 }}>
      <script src="/jspm_packages/system.js" />
      <script src="/config.js" />

      <script dangerouslySetInnerHTML={{ __html: `
        System.import('babel-polyfill'); System.import('/app/client/client').catch(console.log.bind(console));
      ` }} />,
    </div>
  );
}

export default () => (
  <Page className='app'>
    <app id="app"><AppSpinner /></app>
    <Boot />
  </Page>
);

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Router, Route, IndexRoute, IndexRedirect, browserHistory } from 'react-router';
import { Provider } from 'react-redux';
import { AppMain, AppSignin, AppSignup, AppLogout, AppProtected } from './components/shared/index';
import { RedirectToFirstApp, NewApp, ShowApp } from './components/apps/index';
import { configureStore } from './store/configure_store';
import { auth } from './services/index';

const store = configureStore();

const entry = (
  <Provider store={store}>
    <Router history={browserHistory}>
      <Route path="/" component={AppMain}>
        <Route path="signin" component={AppSignin} onEnter={auth.canActivate(store, { authRequired: false })} />
        <Route path="signup" component={AppSignup} onEnter={auth.canActivate(store, { authRequired: false })} />

        <Route component={AppProtected} onEnter={auth.canActivate(store, { authRequired: true })}>
          <IndexRedirect to="/apps" />

          <Route path="logout" component={AppLogout} />

          <Route path="apps">
            <IndexRoute component={RedirectToFirstApp} />

            <Route path="new" component={NewApp} />
            <Route path=":appId" component={ShowApp} />
          </Route>
        </Route>
      </Route>
    </Router>
  </Provider>
);

ReactDOM.render(entry, document.getElementById('app'));


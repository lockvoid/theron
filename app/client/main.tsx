import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Router, Route, IndexRedirect, browserHistory } from 'react-router';
import { Provider } from 'react-redux';
import { AppMain, AppSignin, AppSignup, AppLogout, AppProtected } from './components/shared/index';
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

          <Route path="apps" component={AppSignin} />
        </Route>
      </Route>
    </Router>
  </Provider>
);

ReactDOM.render(entry, document.getElementById('app'));

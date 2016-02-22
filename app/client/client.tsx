import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { combineReducers, applyMiddleware, createStore } from 'redux';
import { Router, Route, browserHistory } from 'react-router';
import { syncHistory, routeReducer } from 'react-router-redux';
import { Provider, MapStateToProps, MapDispatchToPropsFunction, connect } from 'react-redux';

import { connectTheron } from './actions/theron';
import { AppMain } from './components/shared/app_main';
import { theron } from './reducers/theron';

const createCustomStore = applyMiddleware(syncHistory(browserHistory))(createStore);

const store = createCustomStore(combineReducers({ theron, routing: routeReducer }));

const entry = (
  <Provider store={store}>
    <Router history={browserHistory}>
      <Route path="/" component={AppMain} />
    </Router>
  </Provider>
);

store.dispatch(connectTheron('ws://0.0.0.0:9090/echo', { app: 'theron' }));

ReactDOM.render(entry, document.getElementById('app'));

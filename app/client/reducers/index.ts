import { combineReducers } from 'redux';
import { routeReducer } from 'react-router-redux';
import { reducer as formReducer } from 'redux-form';
import { auth } from './auth';
import { theron } from './theron';
import { apps } from './apps';

export const reducers = combineReducers({
  auth, theron, apps, routing: routeReducer, form: formReducer
});



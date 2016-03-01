import { combineReducers } from 'redux';
import { routeReducer } from 'react-router-redux';
import { reducer as formReducer } from 'redux-form';
import { auth } from './auth';
import { theron } from './theron';

export const reducers = combineReducers({ auth, theron, routing: routeReducer, form: formReducer });

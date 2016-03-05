import { Reducer, combineReducers } from 'redux';
import { syncronizeArray } from '../utils/syncronize_array';
import { SELECT_APP, UNWATCH_APPS } from '../actions/index';

const current = (state = null, action) => {
  if (action.type === SELECT_APP) {
    return action.id;
  } else {
    return state;
  }
}

export const apps = combineReducers(Object.assign({ current }, syncronizeArray('APPS', UNWATCH_APPS)));

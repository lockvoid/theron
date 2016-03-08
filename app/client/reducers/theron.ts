import { Reducer } from 'redux';
import { SIGNIN_SUCCESS, LOGOUT_SUCCESS } from '../actions/index';
import { Theron } from '../../../lib/driver/driver';

export const theron: Reducer = (state = { ref: connectTheron() }, action) => {
  switch (action.type) {
    case SIGNIN_SUCCESS:
      state.ref.setAuth({ headers: { 'X-JWT-TOKEN': action.token.toString() } });
      return state;
    case LOGOUT_SUCCESS:
      state.ref.setAuth({});
      return state;
    default:
      return state;
  }
}

function connectTheron() {
  return new Theron('/* @echo THERON_WS */', { app: 'theron' });
}


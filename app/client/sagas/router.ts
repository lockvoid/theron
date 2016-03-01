import { routeActions } from 'react-router-redux';
import { take, race, select, call, put, fork } from 'redux-saga/effects';
import { SIGNIN_SUCCESS, LOGOUT_SUCCESS } from '../actions/index';

function* pendingPath(otherwise: string) {
  const { state } = yield select(state => state.routing.location);
  return state && state.nextPathname ? state.nextPathname : otherwise;
}

function* watchSignin() {
  while (true) {
    const { signin, logout } = yield race({ signin: take(SIGNIN_SUCCESS), logout: take(LOGOUT_SUCCESS)});

    if (signin) {
      signin.redirect && (yield put(routeActions.push(yield call(pendingPath, '/'))));
    } else {
      logout.redirect && (yield put(routeActions.push('/signin')));
    }
  }
}

export function* routerFlow() {
  yield [
    fork(watchSignin),
  ]
}

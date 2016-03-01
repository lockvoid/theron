import { fork } from 'redux-saga/effects';
import { authFlow } from './auth';
import { routerFlow } from './router';
import { formsFlow } from './forms';

export function* sagas() {
  yield [
    fork(authFlow),
    fork(routerFlow),
    fork(formsFlow),
  ]
}

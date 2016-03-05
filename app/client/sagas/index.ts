import { fork } from 'redux-saga/effects';
import { authFlow } from './auth';
import { appsFlow } from './apps';

export function* sagas() {
  yield [
    fork(authFlow),
    fork(appsFlow),
  ]
}

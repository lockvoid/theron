import { stopSubmit } from 'redux-form';
import { take, race, put, fork } from 'redux-saga/effects';
import { SIGNIN_SUCCESS, SIGNIN_FAILURE } from '../actions/index';

function* watchSignin() {
  while (true) {
    const { failure } = yield race({ success: take(SIGNIN_SUCCESS), failure: take(SIGNIN_FAILURE)});

    if (failure) {
      yield put(stopSubmit('signin', { _error: failure.reason.message }));
    } else {
      yield put(stopSubmit('signin'));
    }
  }
}

export function* formsFlow() {
  yield [
    fork(watchSignin),
  ]
}

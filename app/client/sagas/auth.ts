import { take, race, call, put, fork, select } from 'redux-saga/effects';
import { REQUEST_SIGNIN, SIGNIN_SUCCESS, SIGNIN_FAILURE, REQUEST_LOGOUT, LOGOUT_SUCCESS, AUTH_TOKEN_KEY } from '../actions/index';
import { signin, signedIn, signinFailure, logout, loggedOut } from '../actions/index';
import { waitEvent } from '../utils/wait_event';
import { auth } from '../services/index';

function* signinWithPassword({ email, password }) {
  try {
    const { fetched } = yield race({ fetched: call(auth.fetchToken, email, password), overwise: take(REQUEST_LOGOUT) })

    if (fetched) {
      yield call(storeToken, fetched.token, true);
    } else {
      yield call(clearToken, false);
    }
  } catch (error) {
    yield put(signinFailure(error.fetched));
  }
}

function* storeToken(tokenHash: string, redirect: boolean) {
  const token = auth.setToken(tokenHash);
  yield put(signedIn(token, redirect));
}

function* clearToken(redirect) {
  auth.removeToken();
  yield put(loggedOut(redirect));
}

function* renewToken() {
}

function* watchTokenStorage() {
  while (true) {
    const { key, newValue, oldValue } = yield call(waitEvent, window, 'storage');

    if (key !== AUTH_TOKEN_KEY) {
      continue;
    }

    if (newValue) {
      oldValue ? void 0 /* renew token */ : yield call(storeToken, newValue, true);
    } else {
      yield put(logout());
    }
  }
}

function* watchTokenExpiration(expiresIn) {
  const { expired } = yield race({ expired: call(auth.expireToken, expiresIn), overwise: take(REQUEST_LOGOUT) })

  if (expired) {
    yield call(renewToken);
  } else {
    yield call(clearToken, true);
  }
}

export function* authFlow() {
  while (true) {
    yield fork(watchTokenStorage);

    const token = auth.getToken();

    if (token) {
      const state = yield select(state => state.auth);

      if (!state || state.token.toString() !== token.toString()) {
        yield put(signedIn(token, false));
      }

      yield call(watchTokenExpiration, token.expiresIn);
    } else {
      yield call(clearToken, false);
    }

    const { credentials } = yield race({ credentials: take(REQUEST_SIGNIN), overwise: take(SIGNIN_SUCCESS) });

    if (credentials) {
      yield call(signinWithPassword, credentials);
    }
  }
}

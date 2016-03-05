import { routeActions } from 'react-router-redux';
import { take, race, call, put, fork, select } from 'redux-saga/effects';
import { wrapObservable } from '../utils/wrap_observable';
import { REDIRECT_TO_FIRST_APP, SELECT_APP, CREATE_APP, UPDATE_APP, DELETE_APP, WATCH_APPS, UNWATCH_APPS } from '../actions/index';
import { Theron, ROW_ADDED, ROW_CHANGED, ROW_REMOVED } from '../../../lib/driver/driver';

function* watchCreate() {
  while (true) {
    const { payload, resolve, reject } = yield take(CREATE_APP);
    const { api } = yield select(state => state.auth);

    try {
      const { id } = yield api.createApp(payload);
      const { apps } = yield select();

      if (!apps.rows.some(app => app.id === id)) {
        yield take(action => action.query === 'APPS' && action.type === ROW_ADDED && action.payload.row.id === id);
      }

      resolve();

      yield put(routeActions.push(`/apps/${id}`));
    } catch(error) {
      typeof error.message === 'object' ? reject(error.message) : reject({ _error: error.message });
    }
  }
}

function* watchUpdate() {
  while (true) {
    const { id, payload, resolve, reject } = yield take(UPDATE_APP);
    const { auth: { api } } = yield select();

    try {
      yield [
        take(action => action.query === 'APPS' && action.type === ROW_CHANGED && action.payload.row.id === id),
        api.updateApp(id, payload),
      ];

      resolve();
    } catch(error) {
      typeof error.message === 'object' ? reject(error.message) : reject({ _error: error.message });
    }
  }
}

function* watchDelete() {
  while (true) {
    const { id } = yield take(DELETE_APP);
    const { auth: { api } } = yield select();

    try {
      const [{ payload: { prevRowId } }] = yield [
        take(action => action.query === 'APPS' && action.type === ROW_REMOVED && action.payload.row.id === id),
        api.deleteApp(id),
      ];

      const { apps } = yield select();

      if (prevRowId) {
        const nextRow = apps.rows.get(apps.rows.findIndex(row => row.id === prevRowId) + 1);

        var redirectTo = nextRow ? nextRow.id : prevRowId;
      } else {
        var redirectTo = apps.rows.isEmpty() ? 'new' : apps.rows.first().id;
      }

      yield put(routeActions.push(`apps/${redirectTo}`));
    } catch(error) {
      console.log(error);
    }
  }
}

function* indexRedirect() {
  while (true) {
    yield take(REDIRECT_TO_FIRST_APP);

    const { apps } = yield select();

    if (apps.rows.isEmpty()) {
      var redirectTo = 'apps/new';
    } else {
      var redirectTo = `apps/${apps.rows.get(0).id}`;
    }

    yield put(routeActions.push(redirectTo));
  }
}

function* streamApps() {
  while (true) {
    yield take(WATCH_APPS);

    const { theron } = yield select();

    for (let next of wrapObservable(theron.ref.watch('/api/apps', { orderBy: 'name'}))) {
      const { action } = yield race({ action: next, overwise: take(UNWATCH_APPS) });

      if (action) {
        yield put(Object.assign({}, action, { query: 'APPS' }));
      } else {
        break;
      }
    }
  }
}

export function* appsFlow() {
  yield [
    fork(watchCreate),
    fork(watchUpdate),
    fork(watchDelete),
    fork(indexRedirect),
    fork(streamApps),
  ]
}


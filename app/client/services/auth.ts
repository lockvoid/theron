import { AUTH_TOKEN_KEY } from '../actions/index';
import { AuthToken } from '../lib/auth_token';
import { FetchError } from '../lib/fetch_error';

export function canActivate(store, { authRequired } : { authRequired: boolean }) {
  return (nextState, replaceState, performState) => {
    const check = (unsubscribe = null) => {
      const { auth } = store.getState();

      if (auth === null) {
        return false;
      }

      unsubscribe && unsubscribe();

      if (authRequired) {
        auth.token || replaceState({ pathname: '/signin', state: { nextPathname: nextState.location.pathname } });
      } else {
        auth.token && replaceState({ pathname: '/apps' });
      }

      performState()
    }

    if (check() === false) {
      let unsubscribe = store.subscribe(() => check(unsubscribe));
    }
  }
}

export function fetchToken(email, password) {
  let headers: any = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }

  let body = JSON.stringify({
    email,
    password
  });

  const checkStatus = async (res) => {
    if (res.status >= 200 && res.status < 300) {
      return res;
    }

    try {
      var reason = new FetchError(res.status, (await res.json()).reason);
    } catch (error) {
      var reason = new FetchError(res.status, res.statusText);
    }

    throw reason;
  }

  return fetch('/api/auth', { method: 'post', headers, body }).then(checkStatus).then(res => res.json())
}

export function setToken(token: string): AuthToken {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  return getToken();
}

export function getToken(): AuthToken {
  try {
    return new AuthToken(localStorage.getItem(AUTH_TOKEN_KEY));
  } catch (error) {
    return null;
  }
}

export function removeToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function expireToken(expiresIn: number) {
  return new Promise(resolve => setTimeout(() => resolve(true), Math.min(expiresIn, 2147483647)));
}

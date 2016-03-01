import { AuthToken } from '../lib/auth_token';

export const REQUEST_SIGNIN = 'TN:REQUEST_SIGNIN';
export const SIGNIN_SUCCESS = 'TN:SIGNIN_SUCCESS';
export const SIGNIN_FAILURE = 'TN:SIGNIN_FAILURE';
export const REQUEST_LOGOUT = 'TN:REQUEST_LOGOUT';
export const LOGOUT_SUCCESS = 'TN:LOGOUT_SUCCESS';
export const AUTH_TOKEN_KEY = 'TN:AUTH_TOKEN_KEY';

export const CONNECT_THERON = 'TN:CONNECT_THERON';

export function signin(email: string, password: string) {
  return { type: REQUEST_SIGNIN, email, password };
}

export function signedIn(token: AuthToken, redirect: boolean) {
  return { type: SIGNIN_SUCCESS, token, redirect };
}

export function signinFailure(reason) {
  return { type: SIGNIN_FAILURE, reason };
}

export function logout() {
  return { type: REQUEST_LOGOUT };
}

export function loggedOut(redirect) {
  return { type: LOGOUT_SUCCESS, redirect };
}

export function connectTheron(url: string, options: { app: string }) {
  return { type: CONNECT_THERON, url, options };
}

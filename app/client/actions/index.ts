import { AuthToken } from '../lib/auth_token';

export const SIGNIN = 'TN:REQUEST_SIGNIN';
export const SIGNIN_SUCCESS = 'TN:SIGNIN_SUCCESS';
export const SIGNIN_FAILURE = 'TN:SIGNIN_FAILURE';
export const SIGNUP = 'TN:REQUEST_SIGNUP';
export const SIGNUP_SUCCESS = 'TN:SIGNUP_SUCCESS';
export const SIGNUP_FAILURE = 'TN:SIGNUP_FAILURE';
export const LOGOUT = 'TN:REQUEST_LOGOUT';
export const LOGOUT_SUCCESS = 'TN:LOGOUT_SUCCESS';
export const AUTH_TOKEN_KEY = 'TN:AUTH_TOKEN_KEY';

export const CONNECT_THERON = 'TN:CONNECT_THERON';

export function signin(email: string, password: string) {
  return { type: SIGNIN, email, password };
}

export function signinSuccess(token: AuthToken, performRedirect: boolean) {
  return { type: SIGNIN_SUCCESS, token, performRedirect };
}

export function signinFailure(reason: string) {
  return { type: SIGNIN_FAILURE, reason };
}

export function signup(email: string, password: string, name: string) {
  return { type: SIGNUP, email, password, name };
}

export function signupSuccess() {
  return { type: SIGNUP_SUCCESS };
}

export function signupFailure(reason: string) {
  return { type: SIGNUP_FAILURE, reason };
}

export function logout() {
  return { type: LOGOUT };
}

export function logoutSuccess(performRedirect: boolean) {
  return { type: LOGOUT_SUCCESS, performRedirect };
}

export function connectTheron(url: string, options: { app: string }) {
  return { type: CONNECT_THERON, url, options };
}

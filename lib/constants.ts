// Action Types

export const CONNECT = 'TN:CONNECT';
export const DISCONNECT = 'TN:DISCONNECT';
export const OK = 'TN:OK';
export const ERROR = 'TN:ERROR';

export const SUBSCRIBE = 'TN:SUBSCRIBE';
export const UNSUBSCRIBE = 'TN:UNSUBSCRIBE';
export const PUBLISH = 'TN:PUBLISH';

export const ROW_ADDED = 'TN:ROW_ADDED';
export const ROW_REMOVED = 'TN:ROW_REMOVED';
export const ROW_MOVED = 'TN:ROW_MOVED';
export const ROW_CHANGED = 'TN:ROW_CHANGED';

export const BEGIN_TRANSACTION = 'TN:BEGIN_TRANSACTION';
export const COMMIT_TRANSACTION = 'TN:COMMIT_TRANSACTION';
export const ROLLBACK_TRANSACTION = 'TN:ROLLBACK_TRANSACTION';

//  Error Codes
//
//  4000-4099: The connection SHOULD NOT be re-established unchanged.
//
//  4100-4199: The connection SHOULD be re-established after backing off.
//
//  4200-4299: The connection SHOULD be re-established immediately.

export const SSL_REQUIRED = 4000;
export const APP_DOES_NOT_EXIST = 4001;
export const APP_DISABLED = 4002;
export const APP_DISCONNECTED = 4004;
export const INVALID_SECRET_KEY = 4004;
export const TOO_MANY_CONNECTION = 4005;
export const MALFORMED_SYNTAX = 4006;
export const UNAUTHORIZED_REQUEST = 4007;
export const BAD_REQUEST = 4008;
export const OVER_CAPACITY = 4100;
export const SERVER_ERROR = 4101;

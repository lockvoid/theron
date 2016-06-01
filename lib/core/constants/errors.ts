// 4000-4099: LEVEL 1
// The connection or request SHOULD NOT be re-established unchanged.

export const SSL_REQUIRED = 4000;
export const ACCOUNT_SUSPENED = 4001;
export const TOO_MANY_CONNECTION = 4002;
export const BAD_REQUEST = 4003;
export const UNAUTHORIZED_REQUEST = 4004;
export const NOT_FOUND = 4005;

// 4100-4199: LEVEL 2
// The connection or request SHOULD be re-established exponentially.

export const OVER_CAPACITY = 4100;
export const SERVER_RESTARTING = 4101;
export const INTERNAL_SERVER_ERROR = 4102;
export const RESOURCE_GONE = 4103;

// 4200-4299: LEVEL 3
// The connection or request SHOULD be re-established instantly.

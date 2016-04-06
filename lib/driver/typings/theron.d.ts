import { Observable } from 'rxjs/Observable';

export const REQUEST_SUCCESS: string;
export const REQUEST_FAILURE: string;
export const ROW_ADDED: string;
export const ROW_REMOVED: string;
export const ROW_MOVED: string;
export const ROW_CHANGED: string;
export const BEGIN_TRANSACTION: string;
export const COMMIT_TRANSACTION: string;
export const ROLLBACK_TRANSACTION: string;

export interface TheronAuth {
  headers?: any;
  params?: any;
}

export interface TheronOptions {
  app: string;
  secret?: string;
}

export declare class Theron  {
  static sign(query: string, secret: string): string;

  constructor(url: string, options: TheronOptions);

  setAuth(auth?: TheronAuth): void;

  watch<T>(endpoint: string, params?: any): Observable<T>;
}

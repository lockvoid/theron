import { Observable } from 'rxjs/Observable';
import { NextObserver } from 'rxjs/Observer';

export const CONNECT: string;
export const DISCONNECT: string;
export const OK: string;
export const ERROR: string;
export const ROW_ADDED: string;
export const ROW_REMOVED: string;
export const ROW_MOVED: string;
export const ROW_CHANGED: string;
export const BEGIN_TRANSACTION: string;
export const COMMIT_TRANSACTION: string;
export const ROLLBACK_TRANSACTION: string;

export interface TheronAppOptions {
  app: string;
  secret?: string;
  onConnect?: NextObserver<any>;
  onDisconnect?: NextObserver<any>;
}

export interface TheronAuthOptions {
  headers?: any;
  params?: any;
}

export interface TheronSecureOptions {
  sign?: string;
}

export interface TheronRescueOptions {
  retry?: boolean;
}

export interface TheronAsideEffects {
  onSubscribe?: NextObserver<any>;
  onUnsubscribe?: NextObserver<any>;
}

export interface BaseRow {
  id: string;
}

export interface BaseAction {
  type: string;
  id?: string;
  channel?: string;
  token?: string;
}

export interface TheronDataArtefact<T> extends BaseAction {
  payload?: T;
}

export interface TheronRowArtefact<T extends BaseRow> extends TheronDataArtefact<{ row: T, prevRowId: string }> {
}

export type TheronTransport<T> = T & BaseAction;

export declare class Theron  {
  static sign(data: string, secret: string): string;

  constructor(url: string, options: TheronAppOptions);

  setAuth(auth?: TheronAuthOptions): void;

  disconnect() : void;

  isConnected() : boolean;

  request<T, R>(type: string, data?: T, options?: TheronRescueOptions): Observable<TheronTransport<R>>;

  publish<T>(channel: string, payload?: T, options?: TheronRescueOptions): Observable<TheronTransport<{}>>;

  join<T>(channel: string, options?: TheronRescueOptions & TheronSecureOptions & TheronAsideEffects): Observable<TheronDataArtefact<T>>;

  watch<T extends BaseRow>(url: string, params?: any, options?: TheronRescueOptions & TheronAsideEffects): Observable<TheronRowArtefact<T>>;
}

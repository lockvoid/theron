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

export interface TheronOptions {
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

export type TheronObserverConfig = TheronRescueOptions & TheronSecureOptions & { onSubscribe?: NextObserver<any>, onUnsubscribe?: NextObserver<any> };

export type TheronTransport<T> = T & { type: string, id: string }

export interface BaseAction { type: string; id?: string; channel?: string; token?: string; }

export interface TheronDataArtefact<T extends BaseRow> extends BaseAction {
  payload?: { row?: T, rowId?: string, prevRowId: string };
}

export interface BaseRow {
  id: string | number;
}

export declare class Theron  {
  static sign(data: string, secret: string): string;

  constructor(url: string, options: TheronOptions);

  setAuth(auth?: TheronAuthOptions): void;

  disconnect() : void;

  isConnected() : boolean;

  request<T>(type: string, data?: any, options?: TheronRescueOptions): Observable<TheronTransport<T>>;

  publish<T>(channel: string, payload?: any, options?: TheronRescueOptions): Observable<TheronTransport<T>>;

  join<T>(channel: string, options?: TheronObserverConfig): Observable<TheronTransport<T>>;

  watch<T extends BaseRow>(url: string, options?: TheronObserverConfig & { params?: any }): Observable<TheronDataArtefact<T>>;
}

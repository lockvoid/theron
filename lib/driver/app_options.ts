import { NextObserver } from 'rxjs/Observer';

export interface TheronAppOptions {
  app: string;
  secret?: string;
  onConnect?: NextObserver<any>;
  onDisconnect?: NextObserver<any>;
}

import { NextObserver } from 'rxjs/Observer';

export interface TheronAsideEffects {
  onSubscribe?: NextObserver<any>;
  onUnsubscribe?: NextObserver<any>;
}

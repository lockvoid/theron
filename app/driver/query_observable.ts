import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';
import { WebSocketSubject } from 'rxjs/observable/dom/webSocket';

import { SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, QUERY_VALID, QUERY_INVALID } from '../../lib/constants';
import { TheronSubscriptionAction, TheronQueryAction, TheronDataAction } from '../../lib/actions';
import { SocketManager } from './socket_manager';
import { uuid } from '../../lib/utils/uuid';

export class TheronQueryObservable<T> extends Observable<TheronSubscriptionAction> {
  private _subscriptionKey: string = uuid();

  constructor(private _socketManager: SocketManager<TheronSubscriptionAction>, private _queryOptions: TheronQueryAction) {
    super();
  }

  get subscriptionKey(): string {
    return this._subscriptionKey;
  }

  /* protected */ _subscribe(subscriber: Subscriber<TheronDataAction<T>>): Subscription | Function | void {
    let subscription = this._createChannel().subscribe(action => this._connectCache(subscriber, action), err => subscriber.error(err));

    subscriber.add(new Subscription(() => {
      subscription.unsubscribe();
    }));
  }

  protected _connectCache(subscriber: Subscriber<TheronDataAction<T>>, { queryKey }: TheronSubscriptionAction) {
    console.log(queryKey);
  }

  protected _createChannel(): Observable<TheronSubscriptionAction>  {
    return this._socketManager.multiplex(() => this._subscribeMessage(), () => this._unsubscribeMessage(), (action) => this._messageFilter(action))
  }

  protected _subscribeMessage(): TheronSubscriptionAction {
    return { type: SUBSCRIBE_QUERY, subscriptionKey: this.subscriptionKey };
  }

  protected _unsubscribeMessage(): TheronSubscriptionAction {
    return { type: UNSUBSCRIBE_QUERY, subscriptionKey: this.subscriptionKey };
  }

  protected _messageFilter(action: TheronSubscriptionAction) {
    if (action.subscriptionKey !== this._subscriptionKey) {
      return false;
    }

    if (action.type == QUERY_INVALID) {
      throw action.reason;
    }

    return true;
  }
}

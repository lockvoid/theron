import { RedisClient } from 'redis';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { TeardownLogic } from 'rxjs/Subscription';

export class RedisCommand<T> extends Observable<T> {
  protected _args: (string | number)[];

  constructor(protected _client: RedisClient, protected _command: string, ...args: (string | number)[]) {
    super();
    this._args = args;
  }

  protected _subscribe(subscriber: Subscriber<T>): TeardownLogic {
    this._client[this._command].call(this._client, ...this._args, (err, res) => {
      if (err) {
        return subscriber.error(err);
      }

      subscriber.next(res); subscriber.complete();
    });
  }
}

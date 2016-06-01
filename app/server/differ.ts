import { Subscription, AnonymousSubscription } from 'rxjs/Subscription';
import { DifferBalancer } from '../../lib/core/differ_balancer';
import { PubSub } from '../../lib/core/pub_sub';
import { SYSTEM_PREFIX } from '../../lib/core/constants/flags';

export function up(id): AnonymousSubscription {
  const balancer = new DifferBalancer(id);
  const sub = PubSub.fork();

  sub.on('message', (_, message) => balancer.balance(() => {
    balancer.next(JSON.parse(message));
  }));

  sub.on('error', err => {
    balancer.error(err);
  });

  sub.subscribe(PubSub.sanitize(SYSTEM_PREFIX, 'differ'));

  return new Subscription(() => {
    balancer.complete();
    sub.quit();
  });
}

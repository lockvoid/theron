import { RedisClient, createClient } from 'redis';

export class PubSub {
  static pub = createClient(process.env.REDIS_URL);

  static publish(channel: string, data) {
    PubSub.pub.publish(channel, JSON.stringify(data));
  }

  static fork(): RedisClient {
    return createClient(process.env.REDIS_URL);
  }
}

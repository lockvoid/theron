import { RedisClient, createClient } from 'redis';

import { SYSTEM_PREFIX, WEBSOCKET_PREFIX, DATABASE_PREFIX } from '../../../../lib/constants';

export class PubSub {
  static client = createClient(process.env.REDIS_URL);

  static publish(channel: string, data) {
    PubSub.client.publish(channel, JSON.stringify(data));
  }

  static fork(): RedisClient {
    return createClient(process.env.REDIS_URL);
  }

  static normalize(...parts: string[]): string {
    return parts.map(part => String(part).replace(':', '|')).join(':').toLowerCase();
  }

  static publishChannel(suffix: string): string {
    return PubSub.normalize(SYSTEM_PREFIX, WEBSOCKET_PREFIX, 'publish', suffix);
  }

  static respondChannel(suffix: string): string {
    return PubSub.normalize(SYSTEM_PREFIX, WEBSOCKET_PREFIX, 'respond', suffix);
  }

  static toOriginChannel(channel: string): string {
    return channel.split(':').slice(3).join(':').replace('|', ':');
  }

  static isPublishChannel(channel: string): boolean {
    return channel.startsWith(PubSub.publishChannel(''));
  }

  static async countKeys(pattern: string): Promise<number> {
    var count = 0; var cursor = 0;

    while (true) {
      const [next, keys] = await new Promise<any>((resolve, reject) => {
        PubSub.client.scan(cursor, 'MATCH', pattern, 'COUNT', '100', (err, res) => err ? reject(err) : resolve(res));
      });

      if ((cursor = next) == 0) { // NOTE: Don't use the strict comparison operator!
        break;
      }

      count += keys.length;
    }

    return count;
  }
}

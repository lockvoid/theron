import { RedisClient, createClient } from 'redis';

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

  static countKeys(pattern: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const iterate = (acc = 0, cursor = 0) => {
        PubSub.client.scan(cursor, 'MATCH', pattern, 'COUNT', '100', (err, res) => {
          if (err) {
            return reject(err);
          }

          const [cursor, keys] = res;

          if (cursor == 0) {
            return resolve(acc);
          }

          return iterate(acc + keys.length, cursor)
        })
      }

      iterate();
    });
  }
}

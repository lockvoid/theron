import * as crypto from 'crypto';

import { RedisClient, createClient } from 'redis';

import { SYSTEM_PREFIX, WEBSOCKET_PREFIX, DATABASE_PREFIX } from './constants/flags';

export class PubSub {
  static client = createClient(process.env.REDIS_URL);

  static fork(): RedisClient {
    return createClient(process.env.REDIS_URL);
  }

  static parse(data: string): any {
    return JSON.parse(data);
  }

  static stringify(data: any): string {
    return JSON.stringify(data);
  }

  static sanitize(...parts: (string | number)[]): string {
    return parts.map(part => String(part)).join(':').toLowerCase()
  }

  static hmac(data: string = '', secret: string = ''): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const PUBLISH_QUEUE = PubSub.sanitize(SYSTEM_PREFIX, WEBSOCKET_PREFIX, 'publish');
export const RESPOND_QUEUE = PubSub.sanitize(SYSTEM_PREFIX, WEBSOCKET_PREFIX, 'respond');



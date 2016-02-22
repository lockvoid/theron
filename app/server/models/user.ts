import { Database } from '../database';
import { AppRecord } from './app';

export class UserRecord extends Database.Model<any> {
  get tableName() {
    return 'users';
  }

  apps() {
    return this.hasMany(AppRecord);
  }
}

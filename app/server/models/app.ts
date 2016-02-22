import { Database } from '../database';
import { UserRecord } from './user';

export class AppRecord extends Database.Model<any> {
  get tableName() {
    return 'apps';
  }

  user() {
    return this.belongsTo(UserRecord);
  }
}

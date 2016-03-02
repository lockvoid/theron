import { Model } from 'objection';
import { EMAIL_REGEX } from '../../../lib/constants';

import * as bcrypt from 'bcrypt';

export class UserRecord extends Model {
  static tableName = 'users';

  static jsonSchema = {
    type: 'object',
    required: ['email', 'password', 'name'],

    properties: {
      id: {
        type: 'integer',
      },

      email: {
        type: 'string', pattern: EMAIL_REGEX,
      },

      password: {
        type: 'string', minLength: 7,
      },

      name: {
        type: 'string',
      },
    }
  }

  static get relationMappings() {
    return {
      apps: {
        relation: Model.OneToManyRelation, modelClass: require('./app').AppRecord,

        join: {
          from: 'users.id', to: 'apps.user_id'
        },
      },
    }
  }

  static async auth(email: string = '', password: string = ''): Promise<any> {
    let user = await UserRecord.query().where('email', email).first();

    return new Promise((resolve, reject) => {
      if (!user) {
        return resolve(null);
      }

      bcrypt.compare(password, user.password, (err, res) => {
        if (err) {
          reject(err);
        }

        res ? resolve(user) : resolve(null);
      });
    });
  }

  async $beforeInsert(context) {
    this['password'] = await this._encryptPassword(this['password']);
  }

  async $beforeUpdate(options, context) {
    if ('password' in this) {
      this['password'] = await this._encryptPassword(this['password']);
    }
  }

  protected _encryptPassword(password: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          throw err;
        }

        resolve(hash);
      });
    });
  }
}

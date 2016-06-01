import { Model } from 'objection';
import { randomBytes } from 'crypto';
import { BaseModel, BaseSchema } from './base_model';

export interface AppSchema extends BaseSchema {
  id: number;
  user_id: number;
  name: string;
  development: boolean;
  db_url: string;
  app_url: string;
  secret: string;
}

export class AppRecord extends BaseModel {
  static tableName = 'apps';

  static jsonSchema = {
    type: 'object',

    required: [
      'name'
    ],

    properties: {
      id: {
        type: 'integer',
      },

      created_at: {
        type: 'string',
      },

      updated_at: {
        type: 'string',
      },

      user_id: {
        type: 'number',
      },

      name: {
        type: 'string',
      },

      development: {
        type: 'boolean',
      },

      db_url: {
        type: ['string', 'null'],
      },

      app_url: {
        type: ['string', 'null'],
      },

      secret: {
        type: 'string',
      },
    }
  };

  static get relationMappings() {
    return {
      user: {
        relation: Model.OneToOneRelation, modelClass: require('./user').UserRecord,

        join: {
          from: 'apps.user_id', to: 'users.id',
        },
      },
    }
  }

  static generateSecret(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      randomBytes(16, (err, buf) => err ? reject(err) : resolve(buf.toString('hex')));
    });
  }

  async $beforeInsert(context) {
    super.$beforeInsert(context);

    this['secret'] = await AppRecord.generateSecret();
  }
}

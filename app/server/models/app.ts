import { Model } from 'objection';

export class AppRecord extends Model {
  static tableName = 'apps';

  static jsonSchema = {
    type: 'object',
    required: ['name', 'secret'],

    properties: {
      id: {
        type: 'integer',
      },

      name: {
        type: 'string',
      },

      secret: {
        type: 'string',
      },

      development: {
        type: 'boolean',
      },

      app_url: {
        type: 'string',
      },

      db_url: {
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
}

declare module 'objection' {
  import knex = require('knex');

  export class Model {
    static knex(instance: knex): void;

    static OneToOneRelation: Function;
    static OneToManyRelation: Function;

    static query(...args: any[]): any;

    $formatDatabaseJson(obj: any): any;

    $beforeInsert(queryContext: any): Promise<any> | void;
    $beforeUpdate(options: any, queryContext: any): Promise<any> | void;
  }

  export const ValidationError: Function;
}

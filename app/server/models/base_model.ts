import { Model } from 'objection';

export interface BaseSchema {
  id: number;
  created_at: string;
  updated_at: string;
}

export class BaseModel extends Model {
  $beforeInsert(context) {
    super.$beforeInsert(context);

    const now = new Date().toISOString();
    this['updated_at'] = now;
    this['created_at'] = now;
  }

  $beforeUpdate(options, context) {
    super.$beforeUpdate(options, context);

    const now = new Date().toISOString();
    this['updated_at'] = now;
  }
}


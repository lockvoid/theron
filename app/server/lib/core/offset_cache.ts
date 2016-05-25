import { Map } from 'immutable';

export interface BaseRow {
  id: number | string;
}

export class OffsetCache<T extends BaseRow> {
  protected _offset: Map<number | string, number>;

  constructor(protected _rows: T[]) {
    this._offset = Map<number | string, number>(this._rows.reduce<any>((acc, row, index) => { acc[row.id] = index; return acc }, {}));
  }

  get rows(): T[] {
    return this._rows;
  }

  offset(id: number | string): number {
    return this._offset.get(id);
  }
}

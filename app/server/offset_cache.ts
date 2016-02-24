import { BaseRow } from './base_row';

export class OffsetCache<T extends BaseRow> {
  protected _offset = {};

  constructor(protected _rows: T[]) {
    this._rows.forEach((row, index) => this._offset[row.id] = index);
  }

  get rows(): T[] {
    return this._rows;
  }

  offset(id: number): number {
    return this._offset[id];
  }
}

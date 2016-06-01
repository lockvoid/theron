import { BaseAction } from './base_action';
import { BaseRow } from './base_row';

export interface TheronDataArtefact<T extends BaseRow> extends BaseAction {
  payload?: { row?: T, rowId?: string, prevRowId: string };
}

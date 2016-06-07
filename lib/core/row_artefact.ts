import { BaseRow } from './base_row';
import { TheronDataArtefact } from './data_artefact';

export interface TheronRowArtefact<T extends BaseRow> extends TheronDataArtefact<{ row: T, prevRowId: string }> {
}

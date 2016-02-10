import { TheronBaseAction } from './base_action';

export interface TheronDataAction<T> extends TheronBaseAction {
  snapshot: T & { id: string };
  newOffset: number;
  wasOffset: number;
}

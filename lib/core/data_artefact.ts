import { BaseAction } from './base_action';

export interface TheronDataArtefact<T> extends BaseAction {
  payload?: T;
}

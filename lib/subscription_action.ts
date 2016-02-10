import { TheronBaseAction } from './base_action';

export interface TheronSubscriptionAction extends TheronBaseAction {
  subscriptionKey: string;
  queryKey?: string;
}

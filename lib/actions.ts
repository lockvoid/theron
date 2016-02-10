export interface TheronBaseAction {
  type: string;
}

export interface TheronErrorAction {
  code?: number;
  reason?: string;
}

export interface TheronSubscriptionAction extends TheronBaseAction, TheronErrorAction  {
  subscriptionKey: string;
  queryKey?: string;
}

export interface TheronDataAction<T> extends TheronBaseAction, TheronErrorAction {
  snapshot: T & { id: string };
  newOffset: number;
  wasOffset: number;
}

export interface TheronQueryAction {
}

export interface TheronAction<T> {
  type: string;
  payload: T;
}

export interface TheronRequest<T> extends TheronAction<T> {
  id: string;
}

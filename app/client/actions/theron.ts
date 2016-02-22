export const CONNECT_THERON = 'CONNECT_THERON';

export const connectTheron = (url: string, options: { app: string }) => {
  return { type: CONNECT_THERON, url, options };
}

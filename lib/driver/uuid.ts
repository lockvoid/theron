const mask = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

export const uuid = (): string => {
  return mask.replace(/[xy]/g, char =>
    (char === 'x' ? (Math.random() * 16 | 0) : ((Math.random() * 16 | 0) & 0x3 | 0x8)).toString(16)
  );
}

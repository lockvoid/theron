const baseUrl = '/assets';

export const assetPath = (filename: string): string => {
  return `${baseUrl}/${filename}`;
}

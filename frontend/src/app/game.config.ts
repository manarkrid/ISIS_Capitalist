export const GAME_SERVER_URL = 'http://localhost:3000';
export const SERVER_STORAGE_KEY = 'gameServerUrl';

export function normalizeServerUrl(value: string): string {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Adresse invalide');
  }
  url.pathname = url.pathname.replace(/\/graphql\/?$/, '').replace(/\/+$/, '');
  return url.toString().replace(/\/+$/, '');
}

export function getServerUrl(): string {
  try {
    return normalizeServerUrl(localStorage.getItem(SERVER_STORAGE_KEY) || GAME_SERVER_URL);
  } catch { return GAME_SERVER_URL; }
}

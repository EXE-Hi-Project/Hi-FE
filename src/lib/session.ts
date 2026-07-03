const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const PERSISTED_AUTH_KEY = 'hi-auth';
const SESSION_ACTIVE_KEY = 'hi-session-active';

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PERSISTED_AUTH_KEY);
  localStorage.removeItem(SESSION_ACTIVE_KEY);
}

export function markAuthSessionActive() {
  localStorage.setItem(SESSION_ACTIVE_KEY, '1');
}

export function hasAuthSessionMarker() {
  return localStorage.getItem(SESSION_ACTIVE_KEY) === '1'
    || Boolean(localStorage.getItem(TOKEN_KEY))
    || Boolean(localStorage.getItem(USER_KEY))
    || Boolean(localStorage.getItem(PERSISTED_AUTH_KEY));
}

export function buildLoginRedirect(reason = 'session-expired') {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ reason });

  if (!['/login', '/register'].includes(window.location.pathname)) {
    params.set('next', currentPath);
  }

  return `/login?${params.toString()}`;
}

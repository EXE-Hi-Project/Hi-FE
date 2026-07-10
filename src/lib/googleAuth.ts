const OAUTH_TX_KEY = 'hi_google_oauth_tx';

interface OAuthTransaction {
  state: string;
  nonce: string;
  nextPath?: string;
  createdAt: number;
}

function isSafeNextPath(next: string | null | undefined): next is string {
  return !!next && next.startsWith('/') && !next.startsWith('//') && next !== '/login' && next !== '/register';
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  if (!payload) throw new Error('Google credential khong hop le');
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

export function extractSafeNextPath(search: string) {
  const next = new URLSearchParams(search).get('next');
  return isSafeNextPath(next) ? next : null;
}

export function getSafeNextPath(search: string, fallback: string) {
  return extractSafeNextPath(search) ?? fallback;
}

export function buildGoogleOAuthUrl(nextPath?: string) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Đăng nhập Google đang tạm thời chưa được cấu hình. Vui lòng thử lại sau.');
  }

  const tx: OAuthTransaction = {
    state: randomToken(),
    nonce: randomToken(),
    nextPath: isSafeNextPath(nextPath) ? nextPath : undefined,
    createdAt: Date.now(),
  };
  sessionStorage.setItem(OAUTH_TX_KEY, JSON.stringify(tx));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: window.location.origin,
    response_type: 'id_token',
    scope: 'email profile openid',
    state: tx.state,
    nonce: tx.nonce,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function consumeGoogleOAuthRedirect(hash: string) {
  if (!hash || !hash.includes('id_token=')) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const credential = params.get('id_token');
  const state = params.get('state');
  const rawTx = sessionStorage.getItem(OAUTH_TX_KEY);
  sessionStorage.removeItem(OAUTH_TX_KEY);

  if (!credential || !state || !rawTx) {
    throw new Error('Phien dang nhap Google khong hop le');
  }

  const tx = JSON.parse(rawTx) as OAuthTransaction;
  if (Date.now() - tx.createdAt > 10 * 60 * 1000 || tx.state !== state) {
    throw new Error('Phien dang nhap Google da het han');
  }

  const payload = decodeJwtPayload(credential);
  if (payload.nonce !== tx.nonce) {
    throw new Error('Google credential khong khop phien dang nhap');
  }

  return {
    credential,
    nextPath: tx.nextPath,
  };
}

import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';
import { buildLoginRedirect, clearAuthSession } from './session';

const productionApiUrl = 'https://api.hilover.space/api';
const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? productionApiUrl : '/api');

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn(`VITE_API_URL is missing; falling back to ${productionApiUrl}`);
}

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 12_000,
  withCredentials: true,
});

type CsrfResponse = {
  success: boolean;
  data?: {
    csrfToken?: string;
    headerName?: string;
  };
};

let csrfToken: string | null = null;
let csrfHeaderName = 'X-XSRF-TOKEN';
let csrfRequest: Promise<void> | null = null;

function isUnsafeMethod(method?: string) {
  return ['post', 'put', 'patch', 'delete'].includes((method ?? 'get').toLowerCase());
}

function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

function attachCsrfHeader(config: InternalAxiosRequestConfig) {
  const token = csrfToken ?? decodeURIComponent(readCookie('XSRF-TOKEN') ?? '');
  if (!token) return;
  const headers = AxiosHeaders.from(config.headers);
  headers.set(csrfHeaderName, token);
  config.headers = headers;
}

async function ensureCsrfToken(force = false) {
  if (csrfToken && !force) return;
  csrfRequest ??= api.get<CsrfResponse>('/auth/csrf').then(({ data }) => {
    csrfToken = data.data?.csrfToken ?? null;
    csrfHeaderName = data.data?.headerName ?? csrfHeaderName;
  }).finally(() => {
    csrfRequest = null;
  });
  await csrfRequest;
}

api.interceptors.request.use(async (config) => {
  if (isUnsafeMethod(config.method) && !config.url?.includes('/auth/csrf')) {
    await ensureCsrfToken();
    attachCsrfHeader(config);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Force-logout on 401/403 for protected routes, never for auth endpoints themselves
    const url = err.config?.url ?? '';
    const isAuthEndpoint =
      url.includes('/auth/me') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/google') ||
      url.includes('/auth/facebook') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');
    const csrfMissing = err.response?.status === 403
      && err.config
      && isUnsafeMethod(err.config.method)
      && String(err.response?.data?.message ?? '').toLowerCase().includes('csrf');

    if (csrfMissing && !err.config.__csrfRetried) {
      csrfToken = null;
      err.config.__csrfRetried = true;
      return ensureCsrfToken(true).then(() => {
        attachCsrfHeader(err.config);
        return api.request(err.config);
      });
    }

    if (err.response?.status === 403 && err.config && isUnsafeMethod(err.config.method)) {
      csrfToken = null;
    }
    if ((err.response?.status === 401 || err.response?.status === 403) && !isAuthEndpoint) {
      const authPaths = ['/login', '/register', '/forgot-password'];
      if (authPaths.includes(window.location.pathname)) {
        return Promise.reject(err);
      }
      clearAuthSession();
      toast.error('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
      window.location.href = buildLoginRedirect();
    }
    return Promise.reject(err);
  }
);

export default api;

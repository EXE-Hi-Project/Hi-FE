import { create } from 'zustand';
import { ApiResponse, AuthPayload, RegisterDto, User } from '../types';
import api from '../lib/api';
import { clearAuthSession, hasAuthSessionMarker, markAuthSessionActive } from '../lib/session';
import { getUserFacingError } from '../lib/userFacingError';

type AuthApiResponse = ApiResponse<AuthPayload> & Partial<AuthPayload>;
type UserApiResponse = ApiResponse<{ user: User }> & { user?: User };
type AuthErrorData = { code?: string; email?: string; trackingId?: string };

function authRequestError(err: any, fallback: string) {
  const error = new Error(getUserFacingError(err, fallback)) as Error & AuthErrorData;
  const data = err.response?.data?.data as AuthErrorData | undefined;
  error.code = data?.code;
  error.email = data?.email;
  error.trackingId = data?.trackingId;
  return error;
}

const SESSION_MARKER = 'cookie-session';

function unwrapAuthPayload(response: AuthApiResponse): AuthPayload {
  const payload = response.data ?? { token: response.token, user: response.user };
  if (!payload.user) {
    throw new Error('Phản hồi đăng nhập không hợp lệ');
  }
  return { token: payload.token, user: payload.user };
}

function unwrapUserPayload(response: UserApiResponse): User {
  const user = response.data?.user ?? response.user;
  if (!user) {
    throw new Error('Phản hồi người dùng không hợp lệ');
  }
  return user;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isBootstrapping: boolean;
  bootstrapSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterDto) => Promise<any>;
  verifyActivation: (email: string, otp: string) => Promise<void>;
  resendActivation: (email: string) => Promise<void>;
  socialLogin: (provider: 'google' | 'facebook', payload: Record<string, string>) => Promise<User>;
  refreshSession: () => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isBootstrapping: true,

  bootstrapSession: async () => {
    if (!hasAuthSessionMarker()) {
      set({ user: null, token: null, isBootstrapping: false });
      return;
    }
    try {
      const { data } = await api.get<UserApiResponse>('/auth/me');
      markAuthSessionActive();
      set({ user: unwrapUserPayload(data), token: SESSION_MARKER, isBootstrapping: false });
    } catch {
      clearAuthSession();
      set({ user: null, token: null, isBootstrapping: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthApiResponse>('/auth/login', { email, password });
      const payload = unwrapAuthPayload(data);
      markAuthSessionActive();
      set({ user: payload.user, token: SESSION_MARKER, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(getUserFacingError(err, 'Đăng nhập thất bại'));
    }
  },

  register: async (formData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<any>('/auth/register', formData);
      set({ isLoading: false });
      if (data.data?.pendingActivation) {
        return data.data;
      }
      const payload = unwrapAuthPayload(data);
      markAuthSessionActive();
      set({ user: payload.user, token: SESSION_MARKER });
      return payload.user;
    } catch (err: any) {
      set({ isLoading: false });
      throw authRequestError(err, 'Đăng ký thất bại');
    }
  },

  verifyActivation: async (email, otp) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthApiResponse>('/auth/verify-activation', { email, otp });
      const payload = unwrapAuthPayload(data);
      markAuthSessionActive();
      set({ user: payload.user, token: SESSION_MARKER, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(getUserFacingError(err, 'Kích hoạt tài khoản thất bại'));
    }
  },

  resendActivation: async (email) => {
    try {
      await api.post(`/auth/resend-activation?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      throw authRequestError(err, 'Gửi lại mã OTP thất bại');
    }
  },

  socialLogin: async (provider, payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthApiResponse>(`/auth/${provider}`, payload);
      const authPayload = unwrapAuthPayload(data);
      markAuthSessionActive();
      set({ user: authPayload.user, token: SESSION_MARKER, isLoading: false });
      return authPayload.user;
    } catch (err: any) {
      set({ isLoading: false });
      throw authRequestError(err, `Đăng nhập ${provider} thất bại`);
    }
  },

  refreshSession: async () => {
    const { data } = await api.post<AuthApiResponse>('/auth/refresh');
    const payload = unwrapAuthPayload(data);
    markAuthSessionActive();
    set({ user: payload.user, token: SESSION_MARKER });
  },

  logout: () => {
    api.post('/auth/logout').catch(() => undefined);
    clearAuthSession();
    set({ user: null, token: null });
  },

  updateUser: async (updates) => {
    const { data } = await api.put<UserApiResponse>('/users/profile', updates);
    set({ user: unwrapUserPayload(data) });
  },

  setUser: (user) => set({ user }),
}));

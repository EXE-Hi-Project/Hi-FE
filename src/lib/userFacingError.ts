import axios from 'axios';

const SERVER_ERROR_STATUSES = new Set([500, 502, 503, 504]);
const PUBLIC_MESSAGE_STATUSES = new Set([400, 401, 403, 404, 409, 429]);
const DEFAULT_ERROR_MESSAGE = 'Có lỗi xảy ra. Vui lòng thử lại sau.';

const TECHNICAL_MESSAGE_PATTERNS = [
  /\b(exception|stack|trace|sql|mongo|smtp|jwt|csrf|oauth|payos|axios)\b/i,
  /\b(vite|env|client[_-]?id|secret|credential|configuration|config)\b/i,
  /\b(undefined|null|nan)\b/i,
  /\b(cannot|failed to|network error|timeout|econn|enotfound|refused)\b/i,
  /\b(java|springframework|mongodb|mysql|aws|stripe|googleapis)\b/i,
  /\b(src|main|node_modules|localhost|127\.0\.0\.1)\b/i,
  /\b[A-Za-z_$][\w$]*Error\b/,
  /https?:\/\//i,
];

type ApiErrorBody = {
  message?: unknown;
  data?: {
    code?: unknown;
    trackingId?: unknown;
  };
};

const PUBLIC_ERROR_CODES = new Set(['OTP_DELIVERY_FAILED']);

export function isSafeUserMessage(message: unknown) {
  if (typeof message !== 'string') return false;
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 240) return false;
  return !TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function withTrackingId(message: string, trackingId: unknown) {
  if (typeof trackingId !== 'string' || !trackingId.trim()) return message;
  return `${message} Mã hỗ trợ: ${trackingId}`;
}

export function getUserFacingError(error: unknown, fallback = DEFAULT_ERROR_MESSAGE) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const code = error.response?.data?.data?.code;
    const trackingId = error.response?.data?.data?.trackingId;

    if (typeof code === 'string' && PUBLIC_ERROR_CODES.has(code) && isSafeUserMessage(serverMessage)) {
      return withTrackingId(String(serverMessage).trim(), trackingId);
    }

    if (status && SERVER_ERROR_STATUSES.has(status)) {
      return withTrackingId(fallback, trackingId);
    }

    if (status && PUBLIC_MESSAGE_STATUSES.has(status) && isSafeUserMessage(serverMessage)) {
      return withTrackingId(String(serverMessage).trim(), trackingId);
    }

    return fallback;
  }

  if (error instanceof Error && isSafeUserMessage(error.message)) {
    return error.message.trim();
  }

  return fallback;
}

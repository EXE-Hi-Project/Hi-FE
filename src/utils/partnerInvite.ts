export function normalizePartnerInviteCode(rawValue?: string | null) {
  const value = rawValue?.trim();
  if (!value) return '';

  try {
    const url = new URL(value, window.location.origin);
    const code = url.searchParams.get('code');
    if (code) return code.trim().toUpperCase();
  } catch {
    // Fall through to plain-code normalization.
  }

  return value.replace(/^HI:?/i, '').trim().toUpperCase();
}

export function buildPartnerInviteUrl(code: string) {
  const params = new URLSearchParams({ code });
  return `${window.location.origin}/connect?${params.toString()}`;
}

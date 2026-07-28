import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: { _id: 'user-1' } }),
  },
}));

import { trackEvent } from './analytics';

describe('analytics privacy', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('sends only numeric and boolean metadata without visible element text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await trackEvent('CLICK', 'settings-avatar', {
      count: 2,
      enabled: true,
      privateNote: 'không được gửi',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(options.body));
    expect(payload).toMatchObject({
      userId: 'user-1',
      eventType: 'CLICK',
      target: 'settings-avatar',
      metadata: { count: 2, enabled: true },
    });
    expect(payload).not.toHaveProperty('elementText');
    expect(payload.metadata).not.toHaveProperty('privateNote');
  });
});

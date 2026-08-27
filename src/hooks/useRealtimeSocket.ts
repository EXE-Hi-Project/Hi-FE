import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createRealtimeClient, type RealtimeEvent } from '../lib/realtime';
import { useAuthStore } from '../store/authStore';
import { useRealtimeConnectionStore } from '../store/realtimeStore';
import { mergeChatMessages } from '../components/chat/chatMessageUtils';
import type { ChatMessage, Notification } from '../types';
import { isDesktopApp } from '../lib/desktop';

type EventData = Record<string, unknown>;

function updateUnreadCount(queryClient: QueryClient, unreadCount: unknown) {
  if (typeof unreadCount !== 'number') return;
  queryClient.setQueryData(['notifications-unread-count'], (current: unknown) => ({
    ...(typeof current === 'object' && current ? current : {}),
    success: true,
    unreadCount,
  }));
}

function handleNotificationEvent(queryClient: QueryClient, event: RealtimeEvent<EventData>) {
  const data = event.data ?? {};
  updateUnreadCount(queryClient, data.unreadCount);

  if (event.type === 'notification.created' && data.notification) {
    const notification = data.notification as Notification;
    if (isDesktopApp()) {
      void window.hiDesktop!.showNotification().catch(() => undefined);
    }
    queryClient.setQueryData<Notification[]>(['notifications'], (current = []) => [
      notification,
      ...current.filter((item) => item._id !== notification._id),
    ]);
    return;
  }

  if (event.type === 'notification.read' && typeof data.notificationId === 'string') {
    queryClient.setQueryData<Notification[]>(['notifications'], (current = []) =>
      current.map((item) => item._id === data.notificationId ? { ...item, read: true } : item),
    );
  } else if (event.type === 'notification.read_all') {
    queryClient.setQueryData<Notification[]>(['notifications'], (current = []) =>
      current.map((item) => ({ ...item, read: true })),
    );
  }
}

function handleChatEvent(queryClient: QueryClient, event: RealtimeEvent<EventData>) {
  const data = event.data ?? {};
  const sessionDate = typeof data.sessionDate === 'string' ? data.sessionDate : undefined;

  if (event.type === 'chat.ai.typing' && sessionDate) {
    queryClient.setQueryData(['chat-ai-typing', sessionDate], true);
    return;
  }
  if ((event.type === 'chat.ai.completed' || event.type === 'chat.ai.failed') && sessionDate) {
    queryClient.setQueryData(['chat-ai-typing', sessionDate], false);
  }

  if (event.type === 'chat.message.created' && data.message) {
    const message = data.message as ChatMessage;
    queryClient.getQueryCache().findAll({ queryKey: ['chat'] }).forEach((query) => {
      const querySessionDate = query.queryKey[2];
      if (sessionDate && querySessionDate !== sessionDate) return;
      queryClient.setQueryData<ChatMessage[]>(query.queryKey, (current = []) => (
        mergeChatMessages(current, [message])
      ));
    });
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
  }

  if (event.type === 'chat.usage.updated') {
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
  }
}

function handlePartnerEvent(queryClient: QueryClient, event: RealtimeEvent<EventData>) {
  queryClient.invalidateQueries({ queryKey: ['partner-cycles'] });
  queryClient.invalidateQueries({ queryKey: ['partner-question-today'] });
  queryClient.invalidateQueries({ queryKey: ['partner-question-history'] });
  queryClient.invalidateQueries({ queryKey: ['partner-anniversaries'] });

  if (event.type === 'partner.connected' || event.type === 'partner.disconnected') {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['profile-connection-poll'] });
  }
}

function handleSubscriptionEvent(queryClient: QueryClient, event: RealtimeEvent<EventData>) {
  const subscription = event.data?.subscription;
  if (subscription) {
    queryClient.setQueriesData({ queryKey: ['subscription'] }, subscription);
  } else {
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
  }
  queryClient.invalidateQueries({ queryKey: ['partner-cycles'] });
  queryClient.invalidateQueries({ queryKey: ['partner-question-today'] });
  if (event.type.startsWith('payment.')) {
    queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
  }
}

function handleAdminEvent(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  queryClient.invalidateQueries({ queryKey: ['admin-affiliate-overview'] });
}

export function useRealtimeSocket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setStatus = useRealtimeConnectionStore((state) => state.setStatus);
  const seenEventIds = useRef(new Set<string>());

  useEffect(() => {
    if (!token || !user?._id) {
      setStatus('idle');
      return undefined;
    }

    const handleEvent = (event: RealtimeEvent) => {
      if (seenEventIds.current.has(event.eventId)) return;
      seenEventIds.current.add(event.eventId);
      if (seenEventIds.current.size > 500) {
        const oldest = seenEventIds.current.values().next().value as string | undefined;
        if (oldest) seenEventIds.current.delete(oldest);
      }

      const typedEvent = event as RealtimeEvent<EventData>;
      if (event.type.startsWith('notification.')) handleNotificationEvent(queryClient, typedEvent);
      else if (event.type.startsWith('chat.')) handleChatEvent(queryClient, typedEvent);
      else if (event.type.startsWith('partner.')) handlePartnerEvent(queryClient, typedEvent);
      else if (event.type.startsWith('subscription.') || event.type.startsWith('payment.')) {
        handleSubscriptionEvent(queryClient, typedEvent);
      } else if (event.type.startsWith('admin.')) {
        handleAdminEvent(queryClient);
      }
    };

    const client = createRealtimeClient(
      user.role === 'admin',
      handleEvent,
      setStatus,
    );
    client.activate();

    return () => {
      setStatus('idle');
      void client.deactivate();
    };
  }, [queryClient, setStatus, token, user?._id, user?.role]);

  return useRealtimeConnectionStore((state) => state.status);
}

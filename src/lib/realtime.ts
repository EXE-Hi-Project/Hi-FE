import { Client, ReconnectionTimeMode, type IMessage, type StompSubscription } from '@stomp/stompjs';

export interface RealtimeEvent<T = unknown> {
  eventId: string;
  type: string;
  occurredAt: string;
  data: T;
}

export type RealtimeEventHandler = (event: RealtimeEvent) => void;

const productionApiUrl = '/api';

export function getRealtimeBrokerUrl(): string {
  const configuredApiUrl =
    import.meta.env.VITE_API_URL || (import.meta.env.PROD ? productionApiUrl : window.location.origin);
  const apiUrl = new URL(configuredApiUrl, window.location.origin);
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  apiUrl.pathname = '/ws';
  apiUrl.search = '';
  apiUrl.hash = '';
  return apiUrl.toString();
}

function parseEvent(message: IMessage): RealtimeEvent | null {
  try {
    const event = JSON.parse(message.body) as RealtimeEvent;
    return event?.eventId && event?.type ? event : null;
  } catch {
    return null;
  }
}

export function createRealtimeClient(
  isAdmin: boolean,
  onEvent: RealtimeEventHandler,
  onStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void,
): Client {
  const client = new Client({
    brokerURL: getRealtimeBrokerUrl(),
    reconnectDelay: 1_000,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    maxReconnectDelay: 15_000,
    heartbeatIncoming: 15_000,
    heartbeatOutgoing: 15_000,
    connectionTimeout: 10_000,
    beforeConnect: () => {
      onStatus('connecting');
    },
    onConnect: () => {
      onStatus('connected');
      const subscriptions: StompSubscription[] = [
        client.subscribe('/user/queue/notifications', (message) => {
          const event = parseEvent(message);
          if (event) onEvent(event);
        }),
        client.subscribe('/user/queue/chat', (message) => {
          const event = parseEvent(message);
          if (event) onEvent(event);
        }),
        client.subscribe('/user/queue/partner', (message) => {
          const event = parseEvent(message);
          if (event) onEvent(event);
        }),
        client.subscribe('/user/queue/subscription', (message) => {
          const event = parseEvent(message);
          if (event) onEvent(event);
        }),
      ];

      if (isAdmin) {
        subscriptions.push(client.subscribe('/topic/admin/overview', (message) => {
          const event = parseEvent(message);
          if (event) onEvent(event);
        }));
      }
    },
    onWebSocketClose: () => onStatus('disconnected'),
    onWebSocketError: () => onStatus('error'),
    onStompError: () => onStatus('error'),
  });

  return client;
}

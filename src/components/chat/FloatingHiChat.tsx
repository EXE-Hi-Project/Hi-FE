import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { getUserFacingError } from '../../lib/userFacingError';
import { ChatMessage } from '../../types';
import { useSubscription, type AiUsage } from '../../hooks/useSubscription';
import { ChatSession, formatSessionLabel, mergeChatMessages, todaySessionDate } from './chatMessageUtils';
import HiLogo from '../ui/HiLogo';
import HiAssistantThread from './HiAssistantThread';
import { ArrowsIn, ArrowsOut, X } from '@phosphor-icons/react';

const QUICK_PROMPTS = [
  'Các tính năng của Hi là gì?',
  'Chu kỳ trước đó của tôi là khi nào?',
  'Kỳ tiếp theo dự kiến khi nào?',
  'Hôm nay tôi nên chăm sóc sức khỏe thế nào?',
];

interface SendChatResponse {
  success: boolean;
  userMessage?: ChatMessage;
  assistantMessage?: ChatMessage;
  message?: ChatMessage;
  aiUsage?: AiUsage;
}

interface OpenChatEvent extends Event {
  detail?: {
    prompt?: string;
  };
}

export default function FloatingHiChat() {
  const { token, user } = useAuthStore();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sessionDate, setSessionDate] = useState(todaySessionDate());
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const isSending = useRef(false);
  const userId = user?._id ?? 'anonymous';
  const subscriptionQuery = useSubscription();

  const hidden = !token
    || user?.role === 'admin'
    || location.pathname === '/login'
    || location.pathname === '/register'
    || location.pathname === '/onboarding'
    || location.pathname === '/chat';

  const sessionsQuery = useQuery<ChatSession[]>({
    queryKey: ['chat-sessions', userId],
    queryFn: () => api.get('/chat/sessions?limit=30').then((r) => r.data.sessions ?? []),
    enabled: !hidden && !!user?._id,
  });

  const chatQuery = useQuery<ChatMessage[]>({
    queryKey: ['chat', userId, sessionDate],
    queryFn: () => api.get('/chat', { params: { sessionDate } }).then((r) => r.data.messages ?? []),
    enabled: !hidden && !!user?._id && !!sessionDate,
  });
  const { data: isRealtimeTyping = false } = useQuery<boolean>({
    queryKey: ['chat-ai-typing', sessionDate],
    queryFn: async () => false,
    enabled: false,
    initialData: false,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.post('/chat', { content, sessionDate }).then((r) => r.data as SendChatResponse),
    onSuccess: (data) => {
      const nextMessages = [data.userMessage, data.assistantMessage ?? data.message].filter(Boolean) as ChatMessage[];
      queryClient.setQueryData<ChatMessage[]>(['chat', userId, sessionDate], (current = []) => {
        return mergeChatMessages(current, nextMessages);
      });
      setOptimisticMessages([]);
      queryClient.invalidateQueries({ queryKey: ['chat', userId, sessionDate] });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', userId] });
      queryClient.invalidateQueries({ queryKey: ['subscription', userId] });
    },
    onError: () => {
      setOptimisticMessages([]);
      queryClient.invalidateQueries({ queryKey: ['subscription', userId] });
    },
  });

  const send = useCallback((rawValue: string) => {
    const value = rawValue.trim();
    if (!value || sendMutation.isPending || isSending.current) return;
    isSending.current = true;
    const tempMessage: ChatMessage = {
      _id: `temp-${Date.now()}`,
      userId,
      role: 'user',
      content: value,
      createdAt: new Date().toISOString(),
      sessionDate,
    } as ChatMessage;
    setOpen(true);
    setOptimisticMessages([tempMessage]);
    sendMutation.mutate(value, {
      onSettled: () => {
        isSending.current = false;
      }
    });
  }, [sendMutation, sessionDate, userId]);

  useEffect(() => {
    setSessionDate(todaySessionDate());
    setOptimisticMessages([]);
    isSending.current = false;
  }, [userId]);

  useEffect(() => {
    const handler = (event: Event) => {
      const prompt = (event as OpenChatEvent).detail?.prompt;
      setSessionDate(todaySessionDate());
      setOpen(true);
      if (prompt) {
        window.setTimeout(() => send(prompt), 0);
      }
    };
    window.addEventListener('hi-chat:open', handler);
    return () => window.removeEventListener('hi-chat:open', handler);
  }, [send]);

  const messages = useMemo(
    () => mergeChatMessages(chatQuery.data, optimisticMessages),
    [chatQuery.data, optimisticMessages],
  );

  const sessions = useMemo(() => {
    const existing = sessionsQuery.data ?? [];
    if (existing.some((session) => session.sessionDate === sessionDate)) {
      return existing;
    }
    return [
      {
        sessionDate,
        title: sessionDate === todaySessionDate() ? 'Hôm nay' : 'Cuộc trò chuyện với Hi AI',
        messageCount: messages.length,
        lastMessageAt: messages[messages.length - 1]?.createdAt,
      },
      ...existing,
    ];
  }, [messages, sessionDate, sessionsQuery.data]);

  if (hidden) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open && (
        <div
          className={[
            'mb-4 flex max-h-[calc(100vh-6rem)] overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-2xl shadow-sky-100/70 backdrop-blur-xl transition-all duration-300',
            expanded
              ? 'h-[min(720px,calc(100vh-6rem))] w-[min(960px,calc(100vw-2rem))]'
              : 'h-[min(680px,calc(100vh-7rem))] w-[min(430px,calc(100vw-2rem))]',
          ].join(' ')}
        >
          {expanded && (
            <aside className="hidden w-72 shrink-0 border-r border-slate-100 bg-slate-50 p-4 md:block">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Lịch sử chat</p>
              <div className="mt-4 space-y-2">
                {sessions.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-3 text-xs font-semibold leading-relaxed text-slate-400">
                    Các phiên chat theo ngày sẽ hiện ở đây.
                  </p>
                ) : sessions.map((session) => (
                  <button
                    key={session.sessionDate}
                    type="button"
                    onClick={() => {
                      setSessionDate(session.sessionDate);
                      setOptimisticMessages([]);
                    }}
                    className={[
                      'w-full rounded-2xl border p-3 text-left text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5',
                      session.sessionDate === sessionDate
                        ? 'border-violet-200 bg-violet-50 text-violet-700'
                        : 'border-slate-100 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700',
                    ].join(' ')}
                  >
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-300">
                      {formatSessionLabel(session.sessionDate)} · {session.messageCount} tin
                    </span>
                    <span className="line-clamp-2">{session.title || 'Cuộc trò chuyện với Hi AI'}</span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <HiLogo size={40} radius={18} />
                <div>
                  <p
                    className="text-base font-black tracking-tight"
                    style={{
                      background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Hi AI
                  </p>
                  <p className="text-[11px] font-bold text-emerald-500">Sẵn sàng trò chuyện</p>
                  {subscriptionQuery.data?.aiUsage && (
                    <p className="text-[10px] font-bold text-slate-400">
                      Còn {subscriptionQuery.data.aiUsage.remaining}/{subscriptionQuery.data.aiUsage.limit} câu hôm nay
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setExpanded((value) => !value)} className="flex size-9 items-center justify-center rounded-full bg-white/80 text-slate-400 transition-all hover:bg-sky-50 hover:text-sky-500" aria-label={expanded ? 'Thu gọn chat' : 'Mở rộng chat'}>
                  {expanded ? <ArrowsIn size={20} aria-hidden="true" /> : <ArrowsOut size={20} aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="flex size-9 items-center justify-center rounded-full bg-white/80 text-slate-400 transition-all hover:bg-pink-50 hover:text-pink-500" aria-label="Đóng chat">
                  <X size={20} weight="bold" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-white/80 px-4 py-3">
              {QUICK_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" onClick={() => send(prompt)} className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">
                  {prompt}
                </button>
              ))}
            </div>

            <HiAssistantThread
              messages={messages}
              isLoading={chatQuery.isLoading}
              isRunning={sendMutation.isPending || isRealtimeTyping}
              errorMessage={sendMutation.isError
                ? getUserFacingError(sendMutation.error, 'Hi AI chưa gửi được câu trả lời. Vui lòng thử lại.')
                : undefined}
              compact
              onSend={send}
            />
          </section>
        </div>
      )}

      <button type="button" onClick={() => setOpen((value) => !value)} className="flex size-14 items-center justify-center rounded-full border border-slate-100 bg-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl" aria-label="Mở Hi AI chat">
        {open
          ? <X size={26} weight="bold" className="text-slate-500" aria-hidden="true" />
          : <HiLogo size={52} radius={24} />}
      </button>
    </div>
  );
}

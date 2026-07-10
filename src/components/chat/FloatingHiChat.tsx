import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { getUserFacingError } from '../../lib/userFacingError';
import { ChatMessage } from '../../types';
import { useSubscription, type AiUsage } from '../../hooks/useSubscription';
import { ChatMessageContent } from './ChatMessageContent';
import { ChatSession, formatChatTime, formatSessionLabel, mergeChatMessages, todaySessionDate } from './chatMessageUtils';
import HiLogo from '../ui/HiLogo';

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
  const [input, setInput] = useState('');
  const [sessionDate, setSessionDate] = useState(todaySessionDate());
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isSending = useRef(false);
  const userId = user?._id ?? 'anonymous';
  const subscriptionQuery = useSubscription();

  const hidden = !token
    || user?.role === 'admin'
    || location.pathname === '/login'
    || location.pathname === '/register'
    || location.pathname === '/onboarding';

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

  const send = useCallback((rawValue?: string) => {
    const value = (rawValue ?? input).trim();
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
    setInput('');
    setOpen(true);
    setOptimisticMessages([tempMessage]);
    sendMutation.mutate(value, {
      onSettled: () => {
        isSending.current = false;
      }
    });
  }, [input, sendMutation, sessionDate, userId]);

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

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages, sendMutation.isPending, isRealtimeTyping]);

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
                  <span className="material-symbols-outlined text-[20px]">{expanded ? 'close_fullscreen' : 'open_in_full'}</span>
                </button>
                <button type="button" onClick={() => setOpen(false)} className="flex size-9 items-center justify-center rounded-full bg-white/80 text-slate-400 transition-all hover:bg-pink-50 hover:text-pink-500" aria-label="Đóng chat">
                  <span className="material-symbols-outlined text-[20px]">close</span>
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

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5">
              {chatQuery.isLoading && <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-white" />}
              {!chatQuery.isLoading && messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="flex size-14 items-center justify-center rounded-3xl bg-violet-100 text-violet-600">
                    <span className="material-symbols-outlined text-[28px]">chat_bubble</span>
                  </span>
                  <p className="mt-4 text-sm font-black text-slate-900">Bắt đầu trò chuyện với Hi AI</p>
                  <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-slate-500">
                    Hỏi về Hi, chu kỳ, cảm xúc, triệu chứng hoặc dữ liệu sức khỏe đã lưu của bạn.
                  </p>
                </div>
              )}
              {messages.map((message) => (
                <div key={message._id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={[
                    'max-w-[84%] rounded-3xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm',
                    message.role === 'user'
                      ? 'rounded-br-md bg-violet-600 text-white shadow-violet-100'
                      : 'border border-slate-100 bg-white text-slate-700',
                  ].join(' ')}>
                    <ChatMessageContent content={message.content} />
                    {message.role === 'user' && <p className="mt-1 text-right text-[10px] font-bold opacity-70">{formatChatTime(message.createdAt)}</p>}
                  </div>
                </div>
              ))}
              {(sendMutation.isPending || isRealtimeTyping) && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-3xl border border-white bg-white px-4 py-3 shadow-sm">
                    <span className="size-2 animate-bounce rounded-full bg-sky-300" />
                    <span className="size-2 animate-bounce rounded-full bg-violet-300 [animation-delay:120ms]" />
                    <span className="size-2 animate-bounce rounded-full bg-pink-300 [animation-delay:240ms]" />
                  </div>
                </div>
              )}
              {sendMutation.isError && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                  {getUserFacingError(sendMutation.error, 'Hi AI chưa gửi được câu trả lời. Vui lòng thử lại.')}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-100 bg-white p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm focus-within:border-sky-200 focus-within:ring-4 focus-within:ring-sky-50">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Nhập câu hỏi cho Hi AI..."
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300"
                />
                <button type="button" onClick={() => send()} disabled={!input.trim() || sendMutation.isPending} className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-40" aria-label="Gửi tin nhắn">
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] font-semibold text-slate-300">Enter để gửi · Shift+Enter xuống dòng</p>
            </div>
          </section>
        </div>
      )}

      <button type="button" onClick={() => setOpen((value) => !value)} className="flex size-14 items-center justify-center rounded-full border border-slate-100 bg-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl" aria-label="Mở Hi AI chat">
        {open
          ? <span className="material-symbols-outlined text-[26px] text-slate-500">close</span>
          : <HiLogo size={52} radius={24} />}
      </button>
    </div>
  );
}

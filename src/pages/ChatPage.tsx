import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { getUserFacingError } from '../lib/userFacingError';
import { ChatMessage } from '../types';
import { useSubscription, type AiUsage } from '../hooks/useSubscription';
import HiLogo from '../components/ui/HiLogo';
import {
  ChatMessageContent,
} from '../components/chat/ChatMessageContent';
import { ChatSession, formatChatTime, formatSessionLabel, mergeChatMessages, todaySessionDate } from '../components/chat/chatMessageUtils';

const femaleSuggestedQuestions = [
  'Chu kỳ trước đó của tôi là khi nào?',
  'Kỳ tiếp theo dự kiến khi nào?',
  'Hôm nay tôi nên ăn gì?',
  'Các tính năng của Hi là gì?',
];

const maleSuggestedQuestions = [
  'Hôm nay tôi nên chăm sóc Người ấy thế nào?',
  'Người ấy đang ở giai đoạn nào?',
  'Kỳ tiếp theo của Người ấy dự kiến khi nào?',
  'Các gói của Hi khác nhau thế nào?',
];

interface SendChatResponse {
  userMessage?: ChatMessage;
  assistantMessage?: ChatMessage;
  message?: ChatMessage;
  aiUsage?: AiUsage;
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const subscriptionQuery = useSubscription();
  const userId = user?._id ?? 'anonymous';
  const [input, setInput] = useState('');
  const [sessionDate, setSessionDate] = useState(todaySessionDate());
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMale = user?.gender === 'male';
  const accent = isMale
    ? {
        soft: 'bg-blue-50',
        text: 'text-blue-500',
        hoverBorder: 'hover:border-blue-100',
        hoverText: 'hover:text-blue-500',
      }
    : {
        soft: 'bg-pink-50',
        text: 'text-pink-500',
        hoverBorder: 'hover:border-pink-100',
        hoverText: 'hover:text-pink-500',
      };
  const suggestedQuestions = isMale ? maleSuggestedQuestions : femaleSuggestedQuestions;

  const sessionsQuery = useQuery<ChatSession[]>({
    queryKey: ['chat-sessions', userId],
    queryFn: () => api.get('/chat/sessions?limit=40').then((r) => r.data.sessions ?? []),
    enabled: !!user?._id,
  });

  const { data: serverMessages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat', userId, sessionDate],
    queryFn: () => api.get('/chat', { params: { sessionDate } }).then((r) => r.data.messages ?? []),
    enabled: !!user?._id && !!sessionDate,
  });
  const { data: isRealtimeTyping = false } = useQuery<boolean>({
    queryKey: ['chat-ai-typing', sessionDate],
    queryFn: async () => false,
    enabled: false,
    initialData: false,
  });

  const messages = useMemo(
    () => mergeChatMessages(serverMessages, optimisticMessages),
    [serverMessages, optimisticMessages],
  );

  const sessions = useMemo(() => {
    const existing = sessionsQuery.data ?? [];
    if (existing.some((session) => session.sessionDate === sessionDate)) return existing;
    return [{ sessionDate, title: 'Hôm nay', messageCount: messages.length, lastMessageAt: messages[messages.length - 1]?.createdAt }, ...existing];
  }, [messages, sessionDate, sessionsQuery.data]);

  const { mutate: sendMessage, isPending } = useMutation({
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
    onError: (error: unknown) => {
      setOptimisticMessages([]);
      toast.error(getUserFacingError(error, 'Hi AI chưa thể trả lời lúc này.'));
      queryClient.invalidateQueries({ queryKey: ['subscription', userId] });
    },
  });

  useEffect(() => {
    setSessionDate(todaySessionDate());
    setOptimisticMessages([]);
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending, isRealtimeTyping]);

  const handleSend = (message = input.trim()) => {
    const nextMessage = message.trim();
    if (!nextMessage || isPending) return;
    const tempMessage: ChatMessage = {
      _id: `temp-${Date.now()}`,
      userId,
      role: 'user',
      content: nextMessage,
      createdAt: new Date().toISOString(),
      sessionDate,
    } as ChatMessage;
    setInput('');
    setOptimisticMessages([tempMessage]);
    sendMessage(nextMessage);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="animate-fade-in grid min-h-[calc(100vh-8rem)] gap-5 lg:grid-cols-[300px_1fr]">
      <aside data-guide="chat-sessions" className="rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
        <div className={clsx('rounded-3xl p-4', accent.soft)}>
          <HiLogo size={48} className="mb-3" />
          <h1
            className="text-xl font-black"
            style={{
              background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Hi AI Chat
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Lịch sử được chia theo ngày và chỉ hiển thị dữ liệu của tài khoản hiện tại.
          </p>
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Phiên trò chuyện</p>
        <div className="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
          {sessions.map((session) => (
            <button
              key={session.sessionDate}
              onClick={() => {
                setSessionDate(session.sessionDate);
                setOptimisticMessages([]);
              }}
              className={clsx(
                'w-full rounded-2xl border p-3 text-left text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5',
                session.sessionDate === sessionDate
                  ? 'border-violet-200 bg-violet-50 text-violet-700'
                  : 'border-slate-100 bg-white text-slate-600',
              )}
            >
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-300">
                {formatSessionLabel(session.sessionDate)} · {session.messageCount} tin
              </span>
              <span className="line-clamp-2">{session.title || 'Cuộc trò chuyện với Hi AI'}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-[calc(100vh-8rem)] overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <HiLogo size={48} />
                <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div>
                <p
                  className="text-lg font-black"
                  style={{
                    background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Hi AI
                </p>
                <p className="text-xs font-bold text-emerald-500">Sẵn sàng trò chuyện · {formatSessionLabel(sessionDate)}</p>
                {subscriptionQuery.data?.aiUsage && (
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    Còn {subscriptionQuery.data.aiUsage.remaining}/{subscriptionQuery.data.aiUsage.limit} câu hôm nay
                  </p>
                )}
              </div>
            </div>
            <div data-guide="chat-suggestions" className="flex gap-2 overflow-x-auto">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => handleSend(question)}
                  className={clsx('shrink-0 rounded-full border border-white bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5', accent.hoverBorder, accent.hoverText)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-5 md:px-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">Đang tải tin nhắn...</div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <HiLogo size={64} className="mb-4" />
                <p className="text-lg font-black text-slate-900">Bắt đầu trò chuyện với Hi AI</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  Bạn có thể hỏi về Hi, gói dịch vụ, lịch chu kỳ, dữ liệu đã ghi nhận hoặc cách chăm sóc theo từng giai đoạn.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message._id} className={clsx('flex items-end gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'assistant' && (
                      <HiLogo size={36} className="shrink-0" />
                    )}
                    <div className={clsx(
                      'max-w-[78%] rounded-3xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm',
                      message.role === 'user'
                        ? 'rounded-br-md bg-violet-600 text-white'
                        : 'rounded-bl-md border border-white bg-white text-slate-700',
                    )}>
                      <ChatMessageContent content={message.content} />
                      <p className={clsx('mt-1 text-[10px] font-bold opacity-60', message.role === 'user' ? 'text-right' : 'text-left')}>
                        {formatChatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(isPending || isRealtimeTyping) && (
              <div className="mt-4 flex items-end gap-2">
                <HiLogo size={36} className="shrink-0" />
                <div className="rounded-3xl rounded-bl-md border border-white bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((index) => (
                      <span key={index} className="size-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: `${index * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-4 md:px-5">
            <div data-guide="chat-input" className="flex items-end gap-2 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm focus-within:border-sky-200 focus-within:ring-4 focus-within:ring-sky-50">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi... Enter để gửi"
                rows={1}
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm font-semibold leading-relaxed text-slate-800 outline-none placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isPending}
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Gửi tin nhắn"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

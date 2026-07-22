import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { getUserFacingError } from '../lib/userFacingError';
import { ChatMessage } from '../types';
import { useSubscription, type AiUsage } from '../hooks/useSubscription';
import HiLogo from '../components/ui/HiLogo';
import { ChatSession, formatSessionLabel, mergeChatMessages, todaySessionDate } from '../components/chat/chatMessageUtils';
import HiAssistantThread from '../components/chat/HiAssistantThread';

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
  const [sessionDate, setSessionDate] = useState(todaySessionDate());
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
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

  const handleSend = (message: string) => {
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
    setOptimisticMessages([tempMessage]);
    sendMessage(nextMessage);
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

          <HiAssistantThread
            messages={messages}
            isLoading={isLoading}
            isRunning={isPending || isRealtimeTyping}
            onSend={handleSend}
          />
        </div>
      </section>
    </div>
  );
}

import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import { PaperPlaneRight, Robot } from '@phosphor-icons/react';
import type { ChatMessage } from '../../types';
import HiLogo from '../ui/HiLogo';
import { ChatMessageContent } from './ChatMessageContent';
import { formatChatTime } from './chatMessageUtils';

interface HiAssistantThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isRunning: boolean;
  errorMessage?: string;
  compact?: boolean;
  onSend: (content: string) => void | Promise<void>;
}

function toAssistantMessage(message: ChatMessage): ThreadMessageLike {
  return {
    id: String(message._id),
    role: message.role === 'user' ? 'user' : 'assistant',
    content: [{ type: 'text', text: message.content }],
    createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
  };
}

function contentFromAppendMessage(message: AppendMessage) {
  return message.content
    .filter((part): part is Extract<(typeof message.content)[number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function AssistantTextPart() {
  const text = useAuiState((state) => state.part.type === 'text' ? state.part.text : '');
  return <ChatMessageContent content={text} />;
}

function AssistantMessage() {
  const role = useAuiState((state) => state.message.role);
  const createdAt = useAuiState((state) => state.message.createdAt);
  const isUser = role === 'user';
  return (
    <MessagePrimitive.Root className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <HiLogo size={34} className="shrink-0" />}
      <div className={`max-w-[84%] rounded-3xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm ${isUser ? 'rounded-br-md bg-violet-600 text-white shadow-violet-100' : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'}`}>
        <MessagePrimitive.Parts components={{ Text: AssistantTextPart }} />
        {createdAt && (
          <p className={`mt-1 text-[10px] font-bold opacity-60 ${isUser ? 'text-right' : 'text-left'}`}>
            {formatChatTime(createdAt.toISOString())}
          </p>
        )}
      </div>
    </MessagePrimitive.Root>
  );
}

export default function HiAssistantThread({
  messages,
  isLoading,
  isRunning,
  errorMessage,
  compact = false,
  onSend,
}: HiAssistantThreadProps) {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: toAssistantMessage,
    isLoading,
    isRunning,
    isSendDisabled: isRunning,
    onNew: async (message) => {
      const content = contentFromAppendMessage(message);
      if (content) await onSend(content);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
        <ThreadPrimitive.Viewport className={`min-h-0 flex-1 overflow-y-auto bg-slate-50 ${compact ? 'px-4 py-5' : 'px-4 py-5 md:px-6'}`}>
          {isLoading && <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-white" />}
          {!isLoading && (
            <ThreadPrimitive.Empty>
              <div className="flex h-full min-h-64 flex-col items-center justify-center px-4 text-center">
                <span className="flex size-14 items-center justify-center rounded-3xl bg-violet-100 text-violet-600">
                  <Robot size={28} weight="duotone" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm font-black text-slate-900">Bắt đầu trò chuyện với Hi AI</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                  Hỏi về Hi, chu kỳ, cảm xúc, triệu chứng hoặc dữ liệu sức khỏe bạn đã lưu.
                </p>
              </div>
            </ThreadPrimitive.Empty>
          )}
          <ThreadPrimitive.Messages components={{ Message: AssistantMessage }} />
          {isRunning && (
            <div className="mt-4 flex items-end gap-2" aria-label="Hi AI đang trả lời">
              <HiLogo size={34} className="shrink-0" />
              <div className="flex items-center gap-1 rounded-3xl rounded-bl-md border border-white bg-white px-4 py-3 shadow-sm">
                <span className="size-2 animate-bounce rounded-full bg-sky-300" />
                <span className="size-2 animate-bounce rounded-full bg-violet-300 [animation-delay:120ms]" />
                <span className="size-2 animate-bounce rounded-full bg-pink-300 [animation-delay:240ms]" />
              </div>
            </div>
          )}
          {errorMessage && (
            <div role="alert" className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              {errorMessage}
            </div>
          )}
        </ThreadPrimitive.Viewport>

        <div className={`border-t border-slate-100 bg-white ${compact ? 'p-3' : 'px-4 py-4 md:px-5'}`}>
          <ComposerPrimitive.Root data-guide="chat-input" className="flex items-end gap-2 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm focus-within:border-sky-200 focus-within:ring-4 focus-within:ring-sky-50">
            <ComposerPrimitive.Input
              placeholder="Nhập câu hỏi cho Hi AI..."
              submitMode="enter"
              rows={1}
              className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm font-semibold leading-relaxed text-slate-800 outline-none placeholder:text-slate-300"
            />
            <ComposerPrimitive.Send className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Gửi tin nhắn">
              <PaperPlaneRight size={18} weight="fill" aria-hidden="true" />
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
          <p className="mt-1.5 text-center text-[10px] font-semibold text-slate-300">Enter để gửi · Shift+Enter xuống dòng</p>
        </div>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

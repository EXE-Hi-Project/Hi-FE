import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChatCircleText,
  Check,
  Clock,
  Heart,
  LockKey,
  PaperPlaneTilt,
  UserPlus,
  Gift,
  PencilSimple,
  Plus,
} from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import Navbar from '../layout/Navbar';
import Button from '../ui/Button';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import PremiumLockCard from '../subscription/PremiumLockCard';
import AnniversaryEventModal from './AnniversaryEventModal';
import { AnniversarySticker, AnniversarySymbol } from './AnniversaryVisuals';
import type {
  CoupleAnniversaryEvent,
  CoupleAnniversarySummary,
  CoupleQuestionHistory,
  CoupleQuestionSession,
} from '../../types/shared';
import {
  getDayAnniversaryOccurrences,
  anniversaryBackground,
  anniversaryEffectClass,
  normalizeAnniversarySummary,
} from '../../utils/coupleAnniversaryCalendar';

type Variant = 'female' | 'male';
type ViewKey = 'today' | 'timeline';

interface PartnerResponse {
  partner?: { id?: string; name?: string; avatar?: string; gender?: string } | null;
}

const answerSchema = z.object({
  content: z.string().trim().min(1, 'Hãy viết câu trả lời trước nhé').max(2000, 'Câu trả lời tối đa 2.000 ký tự'),
});

const messageSchema = z.object({
  content: z.string().trim().min(1, 'Tin nhắn không được để trống').max(1000, 'Tin nhắn tối đa 1.000 ký tự'),
});

type AnswerForm = z.infer<typeof answerSchema>;
type MessageForm = z.infer<typeof messageSchema>;

function dateLabel(value?: string) {
  if (!value) return '';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthRange(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: toIsoDate(first), to: toIsoDate(last) };
}

function buildCalendarDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - mondayOffset);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const visibleDays = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: visibleDays }, (_, index) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      iso: toIsoDate(day),
      label: day.getDate(),
      inCurrentMonth: day.getMonth() === date.getMonth(),
      isToday: toIsoDate(day) === toIsoDate(new Date()),
    };
  });
}

function statusMeta(question: CoupleQuestionSession) {
  if (question.status === 'UNLOCKED') return { label: 'Đã mở', icon: Check, tone: 'text-emerald-600 bg-emerald-50/80 border-emerald-100/80' };
  if (question.status === 'WAITING_PARTNER') return { label: 'Đang chờ', icon: Clock, tone: 'text-amber-600 bg-amber-50/80 border-amber-100/80' };
  return { label: 'Chưa trả lời', icon: LockKey, tone: 'text-slate-500 bg-slate-50/80 border-slate-100/80' };
}

function questionDotClass(question: CoupleQuestionSession | undefined, isMale: boolean) {
  if (!question) return 'bg-transparent';
  if (question.status === 'UNLOCKED') return 'bg-emerald-400 shadow-sm shadow-emerald-400/30';
  if (question.status === 'WAITING_PARTNER') return 'bg-amber-400 shadow-sm shadow-amber-400/30';
  return isMale ? 'bg-blue-400 shadow-sm shadow-blue-400/30' : 'bg-pink-400 shadow-sm shadow-pink-400/30';
}

function QuestionSkeleton() {
  return (
    <div className="animate-pulse px-6 py-12 md:px-12">
      <div className="mx-auto h-4 w-24 rounded-full bg-slate-100" />
      <div className="mx-auto mt-8 h-8 w-5/6 rounded-2xl bg-slate-100" />
      <div className="mx-auto mt-3 h-8 w-2/3 rounded-2xl bg-slate-100" />
      <div className="mt-10 h-44 rounded-3xl bg-slate-100" />
    </div>
  );
}

export default function PartnerHubPage({ variant }: { variant: Variant }) {
  const user = useAuthStore((state) => state.user);
  const { data: subscription } = useSubscription();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView: ViewKey =
    searchParams.get('view') === 'timeline' || searchParams.get('view') === 'history' || searchParams.get('view') === 'anniversaries'
      ? 'timeline'
      : 'today';
  const isMale = variant === 'male';
  const hasPartner = Boolean(user?.partnerId);
  const hasCouplePremium = subscription?.couplePremium === true;
  const settingsPath = isMale ? '/male-settings/notifications' : '/settings/notifications';
  const [selectedQuestion, setSelectedQuestion] = useState<CoupleQuestionSession | null>(null);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [isEditingToday, setIsEditingToday] = useState(false);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyAnswerVal, setHistoryAnswerVal] = useState('');
  const [isAnniversaryModalOpen, setIsAnniversaryModalOpen] = useState(false);
  const [anniversaryModalDate, setAnniversaryModalDate] = useState('');
  const [anniversaryModalEvent, setAnniversaryModalEvent] = useState<CoupleAnniversaryEvent | null>(null);
  const currentMonthRange = useMemo(() => monthRange(visibleMonth), [visibleMonth]);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const partnerQuery = useQuery({
    queryKey: ['partner-cycles', 'questions-page'],
    queryFn: () => api.get('/users/partner-cycles').then(({ data }) => data as PartnerResponse),
    enabled: hasPartner,
  });
  const partnerName = partnerQuery.data?.partner?.name || 'Người ấy';

  const todayQuery = useQuery({
    queryKey: ['partner-question-today'],
    queryFn: () => api.get('/partner/questions/today').then(({ data }) => data.question as CoupleQuestionSession),
    enabled: hasPartner && hasCouplePremium,
    refetchInterval: (query) => query.state.data?.unlocked ? 60_000 : 120_000,
    staleTime: 60_000,
  });

  const historyQuery = useQuery({
    queryKey: ['partner-question-history', currentMonthRange.from, currentMonthRange.to],
    queryFn: () => api.get('/partner/questions/history', {
      params: { page: 0, limit: 62, from: currentMonthRange.from, to: currentMonthRange.to },
    })
      .then(({ data }) => data.history as CoupleQuestionHistory),
    enabled: hasPartner && hasCouplePremium && activeView === 'timeline',
  });
  const anniversariesQuery = useQuery<CoupleAnniversarySummary>({
    queryKey: ['partner-anniversaries'],
    queryFn: () => api.get('/partner/anniversaries').then(({ data }) => normalizeAnniversarySummary(data.anniversaries)),
    enabled: hasPartner && hasCouplePremium && activeView === 'timeline',
    staleTime: 60_000,
  });
  const historyItems = useMemo(() => historyQuery.data?.items ?? [], [historyQuery.data?.items]);
  const questionsByDate = useMemo(() => {
    return new Map(historyItems.map((question) => [question.questionDate.slice(0, 10), question]));
  }, [historyItems]);
  const selectedAnniversaryOccurrences = useMemo(() => {
    if (!selectedHistoryDate || !anniversariesQuery.data) return [];
    const selectedDate = new Date(`${selectedHistoryDate}T00:00:00`);
    return getDayAnniversaryOccurrences(
      anniversariesQuery.data,
      selectedHistoryDate,
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
    );
  }, [anniversariesQuery.data, selectedHistoryDate]);

  const answerForm = useForm<AnswerForm>({
    resolver: zodResolver(answerSchema),
    defaultValues: { content: '' },
  });
  const messageForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  });

  useEffect(() => {
    if (todayQuery.data?.myAnswer?.content) {
      answerForm.reset({ content: todayQuery.data.myAnswer.content });
    }
  }, [answerForm, todayQuery.data?.myAnswer?.content]);

  useEffect(() => {
    setIsEditingToday(false);
  }, [todayQuery.data?._id]);

  useEffect(() => {
    if (activeView !== 'timeline') return;
    if (selectedHistoryDate) {
      setSelectedQuestion(questionsByDate.get(selectedHistoryDate) ?? null);
      return;
    }
    const firstQuestionDate = historyItems[0]?.questionDate.slice(0, 10);
    if (firstQuestionDate) {
      setSelectedHistoryDate(firstQuestionDate);
      setSelectedQuestion(historyItems[0]);
      return;
    }
    setSelectedQuestion(null);
  }, [activeView, historyItems, questionsByDate, selectedHistoryDate]);

  useEffect(() => {
    setIsEditingHistory(false);
    setHistoryAnswerVal(selectedQuestion?.myAnswer?.content ?? '');
  }, [selectedQuestion]);

  const refreshQuestions = () => {
    queryClient.invalidateQueries({ queryKey: ['partner-question-today'] });
    queryClient.invalidateQueries({ queryKey: ['partner-question-history'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  const answerMutation = useMutation({
    mutationFn: (payload: AnswerForm) => api.post('/partner/questions/today/answer', payload),
    onSuccess: () => {
      refreshQuestions();
      setIsEditingToday(false);
      toast.success('Đã lưu câu trả lời');
    },
    onError: () => toast.error('Không thể lưu câu trả lời lúc này'),
  });

  const historyAnswerMutation = useMutation({
    mutationFn: (content: string) => api.put(`/partner/questions/${selectedQuestion?._id}/answer`, { content }),
    onSuccess: (res) => {
      const updatedQuestion = res.data.question as CoupleQuestionSession;
      setSelectedQuestion(updatedQuestion);
      refreshQuestions();
      setIsEditingHistory(false);
      toast.success('Đã lưu câu trả lời');
    },
    onError: () => toast.error('Không thể lưu câu trả lời lúc này'),
  });

  const messageMutation = useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      api.post(`/partner/questions/${sessionId}/messages`, { content }),
    onSuccess: () => {
      messageForm.reset();
      refreshQuestions();
    },
    onError: () => toast.error('Không thể gửi tin nhắn'),
  });

  const accentText = isMale ? 'text-blue-600' : 'text-pink-600';
  const accentSoft = isMale ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700';
  const accentBorder = isMale ? 'focus:border-blue-400 focus:ring-blue-100' : 'focus:border-pink-400 focus:ring-pink-100';
  const pageSurface = isMale
    ? 'bg-gradient-to-b from-sky-50 via-white to-white'
    : 'bg-gradient-to-b from-pink-50 via-white to-white';
  const isBacklogQuestion = Boolean(
    todayQuery.data?.questionDate
      && todayQuery.data.questionDate.slice(0, 10) < toIsoDate(new Date()),
  );

  const switchView = (view: ViewKey) => {
    setSearchParams(view === 'today' ? {} : { view });
  };

  const changeHistoryMonth = (amount: number) => {
    setVisibleMonth((current) => addMonths(current, amount));
    setSelectedHistoryDate(null);
    setSelectedQuestion(null);
    setIsEditingHistory(false);
  };

  const openAnniversaryModal = (date: string, event: CoupleAnniversaryEvent | null = null) => {
    setAnniversaryModalDate(date);
    setAnniversaryModalEvent(event);
    setIsAnniversaryModalOpen(true);
  };

  const openStartDateModal = () => {
    const startDate = anniversariesQuery.data?.startDate;
    if (startDate) {
      openAnniversaryModal(startDate.eventDate.slice(0, 10), startDate);
      return;
    }

    const today = toIsoDate(new Date());
    openAnniversaryModal(today, {
      _id: '',
      type: 'START_DATE',
      eventDate: today,
      title: 'Ngày bên nhau',
      note: '',
      color: 'pink',
      effect: 'sparkle',
      icon: 'favorite',
      sticker: 'heart',
    } as CoupleAnniversaryEvent);
  };

  // Reading this as: Couple features dashboard for couples interested in health and relationships, with a calm, intimate, and modern vibe language, leaning toward custom Tailwind theme + delicate cards split + smooth spring physics motion.
  return (
    <div className={`min-h-[100dvh] ${pageSurface} font-sans text-slate-900`}>
      <Navbar />
      <main className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-8 md:px-8 md:pt-12">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className={`flex items-center gap-2 text-sm font-black ${accentText}`}>
              <Heart size={18} weight="fill" />
              Câu hỏi của chúng mình
            </div>
            <h1 className="hi-page-title mt-3 text-3xl md:text-5xl">
              Một câu hỏi, mỗi ngày
            </h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-slate-500 md:text-base">
              Trả lời riêng. Khi cả hai hoàn thành, câu trả lời sẽ cùng được mở.
            </p>
          </div>
        </header>

        <div className={`mt-8 inline-flex rounded-xl border p-1 shadow-sm backdrop-blur bg-white/80 ${
          isMale ? 'border-blue-100/50 shadow-blue-500/5' : 'border-pink-100/50 shadow-pink-500/5'
        }`}>
          {([
            { key: 'today' as const, label: 'Hôm nay', icon: Heart },
            { key: 'timeline' as const, label: 'Kỷ niệm & câu hỏi', icon: Gift },
          ]).map((item) => {
            const Icon = item.icon;
            const active = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => switchView(item.key)}
                className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-all duration-300 active:scale-[0.97] border ${
                  active
                    ? isMale
                      ? 'bg-blue-50/90 text-blue-600 border-blue-200/60 shadow-sm shadow-blue-500/5'
                      : 'bg-pink-50/90 text-pink-600 border-pink-200/60 shadow-sm shadow-pink-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/60'
                }`}
              >
                <Icon size={17} weight={active ? 'fill' : 'regular'} />
                {item.label}
              </button>
            );
          })}
        </div>

        {!hasPartner ? (
          <section className={`mt-8 rounded-[2rem] border bg-white px-6 py-14 text-center shadow-[0_24px_70px_rgba(148,163,184,0.06)] md:px-12 ${
            isMale ? 'border-blue-100/60' : 'border-pink-100/60'
          }`}>
            <div className={`mx-auto grid size-14 place-items-center rounded-2xl ${accentSoft} shadow-inner`}>
              <UserPlus size={27} weight="duotone" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Kết nối với Người ấy trước nhé</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
              Hai tài khoản cần kết nối hai chiều để cùng nhận một câu hỏi và mở câu trả lời.
            </p>
            <Link
              to={settingsPath}
              className="hi-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-bold"
            >
              Mở cài đặt kết nối
            </Link>
          </section>
        ) : !hasCouplePremium ? (
          <section className="mt-8">
            <PremiumLockCard
              accent={isMale ? 'blue' : 'pink'}
              title="Mở trải nghiệm cặp đôi nâng cao"
              description="Chỉ cần một trong hai tài khoản có Hi Pro hoặc Hi Max để cả hai dùng câu hỏi, lịch sử và hội thoại theo chủ đề."
            />
          </section>
        ) : activeView === 'today' ? (
          <section className={`mt-8 overflow-hidden rounded-[2rem] border bg-white/95 backdrop-blur-[12px] shadow-[0_24px_70px_rgba(148,163,184,0.12)] transition-all duration-300 ${
            isMale ? 'border-blue-100/60' : 'border-pink-100/60'
          }`}>
            {todayQuery.isLoading ? (
              <QuestionSkeleton />
            ) : todayQuery.isError || !todayQuery.data ? (
              <div className="px-6 py-16 text-center">
                <p className="font-bold text-rose-600">Không tải được câu hỏi hôm nay.</p>
                <button
                  type="button"
                  onClick={() => todayQuery.refetch()}
                  className={`mt-3 text-sm font-bold ${accentText}`}
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100/80 bg-slate-50/20 px-6 py-5 md:px-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">{dateLabel(todayQuery.data.questionDate)}</p>
                    <div className="flex items-center gap-2">
                      {isBacklogQuestion && (
                        <span className="flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-700">
                          <Clock size={13} weight="bold" />
                          Câu hỏi còn dang dở
                        </span>
                      )}
                      <span className={`rounded-full px-3.5 py-1 text-xs font-bold border ${
                        isMale ? 'bg-blue-50/80 text-blue-600 border-blue-100/60' : 'bg-pink-50/80 text-pink-600 border-pink-100/60'
                      }`}>
                        {todayQuery.data.category}
                      </span>
                      {(() => {
                        const meta = statusMeta(todayQuery.data);
                        const Icon = meta.icon;
                        return (
                          <span className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold border ${meta.tone}`}>
                            <Icon size={13} weight="bold" />
                            {meta.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-9 md:px-12 md:py-12">
                  <div className="mx-auto max-w-3xl text-center">
                    <div className={`mx-auto inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-extrabold shadow-sm ${isMale ? 'border-blue-100 text-blue-700' : 'border-pink-100 text-pink-700'}`}>
                      <span className={`grid size-7 place-items-center rounded-full text-[10px] text-white ${isMale ? 'bg-blue-500' : 'bg-pink-500'}`}>{user?.name?.trim().charAt(0).toUpperCase() || 'B'}</span>
                      <Heart size={15} weight="fill" />
                      <span className="grid size-7 place-items-center rounded-full bg-violet-500 text-[10px] text-white">{partnerName.trim().charAt(0).toUpperCase() || 'N'}</span>
                      <span className="ml-1">Bạn và {partnerName}</span>
                    </div>
                    <h2 className="mt-4 text-3xl font-normal italic leading-tight text-slate-900 md:text-5xl md:leading-tight">
                      {todayQuery.data.questionText}
                    </h2>
                  </div>

                  {!todayQuery.data.unlocked ? (
                    <form
                      onSubmit={answerForm.handleSubmit((values) => answerMutation.mutate(values))}
                      className="mx-auto mt-10 max-w-2xl"
                    >
                      <label htmlFor="couple-answer" className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Câu trả lời của bạn
                      </label>
                      <textarea
                        id="couple-answer"
                        rows={5}
                        {...answerForm.register('content')}
                        placeholder="Viết điều bạn thật sự muốn chia sẻ..."
                        className={`mt-2.5 w-full resize-none rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white px-5 py-4 text-sm font-semibold leading-relaxed text-slate-900 outline-none transition focus:ring-4 ${accentBorder}`}
                      />
                      {answerForm.formState.errors.content && (
                        <p className="mt-2 text-sm font-semibold text-rose-600">
                          {answerForm.formState.errors.content.message}
                        </p>
                      )}
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <Button type="submit" loading={answerMutation.isPending} className="sm:min-w-40">
                          {todayQuery.data.myAnswer ? 'Cập nhật câu trả lời' : 'Gửi câu trả lời'}
                        </Button>
                      </div>
                      {todayQuery.data.myAnswer && (
                        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50/50 border border-amber-100/60 px-4 py-3.5 text-sm font-semibold leading-relaxed text-amber-700">
                          <LockKey size={18} className="mt-0.5 shrink-0" />
                          <span>
                            {todayQuery.data.partnerAnswered
                              ? 'Người ấy đã trả lời. Câu trả lời đang được mở.'
                              : 'Đã lưu. Bạn vẫn có thể sửa trước khi Người ấy trả lời.'}
                          </span>
                        </div>
                      )}
                    </form>
                  ) : (
                    <div className="mx-auto mt-10 max-w-3xl">
                      <div className="grid gap-6 md:grid-cols-2">
                        <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40 p-5 md:p-6 transition-all hover:bg-slate-50/80">
                          <div className="absolute right-3 top-3 opacity-[0.03] text-slate-900 pointer-events-none">
                            <Heart size={80} weight="fill" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Bạn đã viết</p>
                          <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700">
                            {todayQuery.data.myAnswer?.content}
                          </p>
                        </article>
                        <article className={`relative overflow-hidden rounded-2xl border p-5 md:p-6 transition-all ${
                          isMale
                            ? 'border-blue-100 bg-blue-50/30 hover:bg-blue-50/50'
                            : 'border-pink-100 bg-pink-50/30 hover:bg-pink-50/50'
                        }`}>
                          <div className={`absolute right-3 top-3 opacity-[0.05] ${accentText} pointer-events-none`}>
                            <Heart size={80} weight="fill" />
                          </div>
                          <p className={`text-xs font-black uppercase tracking-wider ${accentText} opacity-80`}>
                            {partnerName} đã viết
                          </p>
                          <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700">
                            {todayQuery.data.partnerAnswer?.content}
                          </p>
                        </article>
                      </div>

                      {isEditingToday ? (
                        <form
                          onSubmit={answerForm.handleSubmit((values) => answerMutation.mutate(values))}
                          className="mt-6 rounded-2xl border border-slate-100/80 bg-slate-50/50 p-5"
                        >
                          <label htmlFor="couple-answer-edit" className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Chỉnh sửa câu trả lời của bạn
                          </label>
                          <textarea
                            id="couple-answer-edit"
                            rows={4}
                            {...answerForm.register('content')}
                            className={`mt-3 w-full resize-none rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-slate-900 outline-none focus:ring-4 ${accentBorder}`}
                          />
                          {answerForm.formState.errors.content && (
                            <p className="mt-2 text-sm font-semibold text-rose-600">
                              {answerForm.formState.errors.content.message}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="submit" loading={answerMutation.isPending} className="text-xs py-1.5 px-3">
                              Lưu thay đổi
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                answerForm.reset({ content: todayQuery.data?.myAnswer?.content ?? '' });
                                setIsEditingToday(false);
                              }}
                              className="text-xs py-1.5 px-3"
                            >
                              Hủy
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            answerForm.reset({ content: todayQuery.data?.myAnswer?.content ?? '' });
                            setIsEditingToday(true);
                          }}
                          className={`mt-4 inline-flex items-center gap-1.5 text-xs font-bold ${accentText} hover:underline`}
                        >
                          <PencilSimple size={14} />
                          Chỉnh sửa câu trả lời của bạn
                        </button>
                      )}

                      <div className="mt-8 border-t border-slate-100 pt-6">
                        <div className="flex items-center gap-2">
                          <ChatCircleText size={20} className={accentText} />
                          <h3 className="font-black text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Nói thêm một chút</h3>
                        </div>
                        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                          {todayQuery.data.messages.length === 0 && (
                            <p className="py-8 text-center text-sm font-semibold text-slate-400">
                              Cuộc trò chuyện của câu hỏi này đang trống.
                            </p>
                          )}
                          {todayQuery.data.messages.map((message) => {
                            const mine = message.userId === user?._id;
                            return (
                              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <p className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm ${
                                  mine
                                    ? 'bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-tr-sm shadow-slate-950/10'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-slate-100/50'
                                }`}>
                                  {message.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        <form
                          onSubmit={messageForm.handleSubmit((values) =>
                            messageMutation.mutate({ sessionId: todayQuery.data!._id, content: values.content }))}
                          className="mt-4 flex gap-3 items-stretch"
                        >
                          <input
                            {...messageForm.register('content')}
                            aria-label="Tin nhắn"
                            placeholder="Nhắn một điều nhỏ..."
                            className={`min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white px-5 py-3 text-sm font-semibold outline-none focus:ring-4 ${accentBorder} transition-all duration-255`}
                          />
                          <Button type="submit" variant="icon" size="lg" loading={messageMutation.isPending} aria-label="Gửi tin nhắn">
                            <PaperPlaneTilt size={18} weight="fill" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        ) : (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]" style={{ contentVisibility: 'auto', containIntrinsicSize: '760px' }}>
            <section className={`rounded-2xl border bg-white p-5 shadow-sm md:p-6 ${
              isMale ? 'border-blue-100/60' : 'border-pink-100/60'
            }`}>
              <div className="px-1 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Kỷ niệm & câu hỏi</h2>
                  <p className="mt-1.5 text-sm font-semibold text-slate-500">Chọn ngày để xem kỷ niệm, câu hỏi và chỉnh sửa câu trả lời.</p>
                </div>
              </div>
              {historyQuery.isLoading || anniversariesQuery.isLoading ? (
                <QuestionSkeleton />
              ) : historyQuery.isError || anniversariesQuery.isError ? (
                <p className="px-2 py-10 text-center text-sm font-bold text-rose-600">Không tải được lịch chung lúc này.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 border-y border-slate-100 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${accentSoft}`}>
                        <Heart size={21} weight="fill" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-500">
                          {anniversariesQuery.data?.startDate?.title || 'Ngày bên nhau'}
                        </p>
                        <p className="mt-0.5 text-2xl font-black leading-none text-slate-900">
                          {anniversariesQuery.data?.daysTogether ?? '—'}{' '}
                          <span className="text-sm font-extrabold text-slate-600">ngày</span>
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {anniversariesQuery.data?.startDate
                            ? `Từ ${new Date(`${anniversariesQuery.data.startDate.eventDate.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN')}`
                            : 'Chưa chọn ngày bắt đầu'}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 min-[420px]:grid-cols-2">
                      <Button type="button" variant="secondary" size="sm" onClick={openStartDateModal} className="w-full justify-center whitespace-nowrap">
                        <PencilSimple size={14} className="mr-1.5" />
                        {anniversariesQuery.data?.startDate ? 'Chỉnh ngày bên nhau' : 'Chọn ngày bên nhau'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openAnniversaryModal(selectedHistoryDate ?? toIsoDate(new Date()))}
                        className="w-full justify-center whitespace-nowrap"
                      >
                        <Plus size={14} className="mr-1.5" weight="bold" />
                        Thêm kỷ niệm
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-1.5">
                    <button
                      type="button"
                      aria-label="Tháng trước"
                      onClick={() => changeHistoryMonth(-1)}
                      className={`grid size-8 place-items-center rounded-xl transition active:scale-90 ${
                        isMale ? 'text-blue-500 hover:bg-blue-50/80' : 'text-pink-500 hover:bg-pink-50/80'
                      }`}
                    >
                      <CaretLeft size={16} weight="bold" />
                    </button>
                    <p className="text-sm font-black capitalize text-slate-900">{monthLabel(visibleMonth)}</p>
                    <button
                      type="button"
                      aria-label="Tháng sau"
                      onClick={() => changeHistoryMonth(1)}
                      className={`grid size-8 place-items-center rounded-xl transition active:scale-90 ${
                        isMale ? 'text-blue-500 hover:bg-blue-50/80' : 'text-pink-500 hover:bg-pink-50/80'
                      }`}
                    >
                      <CaretRight size={16} weight="bold" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.map((day) => {
                      if (!day.inCurrentMonth) {
                        return <span key={day.iso} className="aspect-square min-h-11 sm:min-h-14" />;
                      }
                      const question = questionsByDate.get(day.iso);
                      const selected = selectedHistoryDate === day.iso;
                      const date = new Date(`${day.iso}T00:00:00`);
                      const occurrences = getDayAnniversaryOccurrences(
                        anniversariesQuery.data,
                        day.iso,
                        date.getFullYear(),
                        date.getMonth(),
                      );
                      const primaryOccurrence = occurrences[0];
                      const decorated = Boolean(primaryOccurrence);
                      const dotClass = questionDotClass(question, isMale);
                      return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => {
                          setSelectedHistoryDate(day.iso);
                          setSelectedQuestion(question ?? null);
                          setIsEditingHistory(false);
                        }}
                        aria-label={`${day.label} ${monthLabel(visibleMonth)}${decorated ? `, ${primaryOccurrence.event.title}` : ''}${question ? `, ${question.questionText}` : ''}`}
                        className={`group relative isolate flex aspect-square min-h-11 flex-col items-center justify-center overflow-visible rounded-xl border p-1 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 active:scale-[0.98] sm:min-h-14 sm:text-sm ${
                          selected
                            ? isMale
                              ? 'bg-blue-50/90 text-blue-600 ring-2 ring-blue-300 ring-offset-1'
                              : 'bg-pink-50/90 text-pink-600 ring-2 ring-pink-300 ring-offset-1'
                            : decorated
                              ? `${anniversaryBackground(primaryOccurrence?.event.color, primaryOccurrence?.event.effect)} ${anniversaryEffectClass(primaryOccurrence?.event.effect)} hover:-translate-y-0.5 hover:shadow-md`
                              : 'border-slate-100 bg-slate-50/70 text-slate-700 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <span className={day.isToday
                          ? `relative z-10 rounded-md border px-1.5 py-0.5 text-[11px] ${
                              isMale
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-pink-200 bg-pink-50 text-pink-700'
                            }`
                          : 'relative z-10'}>{day.label}</span>
                        <div className="relative z-10 mt-1 flex h-4 items-center justify-center gap-1">
                          {decorated && (
                            <AnniversarySymbol name={primaryOccurrence.event.icon} size={14} className="anniversary-icon text-current" />
                          )}
                          {question && <span className={`block size-1.5 rounded-full ${dotClass}`} />}
                        </div>
                        {(decorated || question) && (
                          <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 hidden w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl opacity-0 transition group-hover:opacity-100 sm:block">
                            {decorated && (
                              <span className="block text-xs font-extrabold text-slate-900">{primaryOccurrence.event.title}</span>
                            )}
                            {question && (
                              <span className="mt-1 block text-[11px] font-semibold leading-snug text-slate-500">
                                {question.questionText}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 text-[10px] font-bold text-slate-400">
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-pink-400" />Kỷ niệm</span>
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" />Đã mở</span>
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" />Đang chờ</span>
                    <span className="inline-flex items-center gap-1"><span className={`size-2 rounded-full ${isMale ? 'bg-blue-400' : 'bg-pink-400'}`} />Chưa trả lời</span>
                  </div>

                  {historyItems.length === 0 && (anniversariesQuery.data?.events?.length ?? 0) === 0 && !anniversariesQuery.data?.startDate && (
                    <div className="rounded-2xl bg-slate-50/50 border border-slate-100/50 px-4 py-8 text-center">
                      <CalendarBlank size={30} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm font-semibold text-slate-400">Tháng này chưa có câu hỏi hoặc kỷ niệm nào.</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className={`rounded-2xl border bg-white p-6 shadow-sm ${
              isMale ? 'border-blue-100/60' : 'border-pink-100/60'
            }`}>
              {!selectedQuestion && selectedAnniversaryOccurrences.length === 0 ? (
                <div className="grid min-h-[360px] place-items-center text-center">
                  <div className="max-w-xs">
                    <div className={`mx-auto grid size-12 place-items-center rounded-2xl ${
                      isMale ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'
                    }`}>
                      <Heart size={24} weight="duotone" />
                    </div>
                    <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-400">
                      {selectedHistoryDate ? 'Ngày này chưa có câu hỏi hoặc kỷ niệm nào.' : 'Hãy chọn một ngày trên lịch để xem chi tiết câu hỏi, kỷ niệm và câu trả lời nhé.'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">{dateLabel(selectedQuestion?.questionDate ?? selectedHistoryDate ?? undefined)}</p>
                  {selectedAnniversaryOccurrences.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {selectedAnniversaryOccurrences.map((occurrence) => (
                        <article
                          key={occurrence.key}
                          className={`flex items-start gap-3 rounded-2xl border p-4 ${
                            isMale ? 'border-blue-100 bg-blue-50/30' : 'border-pink-100 bg-pink-50/30'
                          }`}
                        >
                          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
                            <AnniversarySticker name={occurrence.event.sticker} size={30} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-sm font-black text-slate-900">{occurrence.event.title}</h3>
                              <button
                                type="button"
                                onClick={() => openAnniversaryModal(occurrence.displayDate, occurrence.event)}
                                className={`inline-flex items-center gap-1 text-xs font-bold ${accentText} hover:underline`}
                              >
                                <PencilSimple size={13} />
                                Sửa
                              </button>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {occurrence.isStartDate ? 'Ngày bên nhau' : 'Kỷ niệm đặc biệt'}
                            </p>
                            {occurrence.event.note && (
                              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-600">
                                {occurrence.event.note}
                              </p>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  {selectedQuestion && (
                    <h2 className="mt-5 text-[28px] font-normal italic leading-snug text-slate-900">
                      {selectedQuestion.questionText}
                    </h2>
                  )}
                  <div className="mt-7 space-y-4">
                    {selectedQuestion?.myAnswer && !isEditingHistory ? (
                      <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-5 transition-all hover:bg-slate-50/80">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Bạn đã viết</p>
                        <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-700">
                          {selectedQuestion.myAnswer.content}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEditingHistory(true)}
                          className={`mt-3 inline-flex items-center gap-1.5 text-xs font-bold ${accentText} hover:underline`}
                        >
                          <PencilSimple size={14} /> Chỉnh sửa câu trả lời
                        </button>
                      </article>
                    ) : selectedQuestion && (!selectedQuestion.myAnswer || isEditingHistory) ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!historyAnswerVal.trim()) {
                            toast.error('Hãy viết câu trả lời trước nhé');
                            return;
                          }
                          historyAnswerMutation.mutate(historyAnswerVal);
                        }}
                        className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3"
                      >
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                          {selectedQuestion.myAnswer ? 'Chỉnh sửa câu trả lời của bạn' : 'Bạn chưa trả lời câu hỏi này'}
                        </label>
                        <textarea
                          rows={4}
                          value={historyAnswerVal}
                          onChange={(e) => setHistoryAnswerVal(e.target.value)}
                          placeholder="Viết câu trả lời của bạn..."
                          className={`w-full resize-none rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-4 ${accentBorder}`}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" loading={historyAnswerMutation.isPending} className="text-xs py-1.5 px-3">
                            Lưu câu trả lời
                          </Button>
                          {selectedQuestion.myAnswer && (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setIsEditingHistory(false)}
                              className="text-xs py-1.5 px-3"
                            >
                              Hủy
                            </Button>
                          )}
                        </div>
                      </form>
                    ) : null}

                    {selectedQuestion?.partnerAnswer && (
                      <article className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                        isMale
                          ? 'border-blue-100 bg-blue-50/30 hover:bg-blue-50/50'
                          : 'border-pink-100 bg-pink-50/30 hover:bg-pink-50/50'
                      }`}>
                        <p className={`text-xs font-black uppercase tracking-wider ${accentText} opacity-80`}>{partnerName} đã viết</p>
                        <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-700">
                          {selectedQuestion.partnerAnswer.content}
                        </p>
                      </article>
                    )}
                    {selectedQuestion && !selectedQuestion.activePair && (
                      <p className="rounded-2xl bg-amber-50/50 border border-amber-100/60 p-4 text-sm font-semibold leading-relaxed text-amber-700">
                        Lịch sử chung đã khóa. Bạn chỉ có thể xem nội dung do mình tạo.
                      </p>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
        <AnniversaryEventModal
          open={isAnniversaryModalOpen}
          onClose={() => setIsAnniversaryModalOpen(false)}
          date={anniversaryModalDate}
          existingEvent={anniversaryModalEvent}
          variant={variant}
        />
      </main>
    </div>
  );
}

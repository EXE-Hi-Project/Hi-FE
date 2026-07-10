import { lazy, Suspense, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import PageBackdrop from '../components/layout/PageBackdrop';
import CycleHistoryDrawer from '../components/cycles/CycleHistoryDrawer';
import CyclePreviewCalendar from '../components/cycles/CyclePreviewCalendar';
import DailyLogModal, { type DailyLogMode } from '../components/health/DailyLogModal';
import HealthVideoSection from '../components/health/HealthVideoSection';
import QuickMoodCard from '../components/health/QuickMoodCard';
import PartnerQuestionPreview from '../components/partner/PartnerQuestionPreview';
import PremiumLockCard from '../components/subscription/PremiumLockCard';
import AffiliateRecommendations from '../components/affiliate/AffiliateRecommendations';
import HiTrustExplainer from '../components/health/HiTrustExplainer';
import api from '../lib/api';
import PricingCard from '../components/PricingCard';
import type { CycleInsights, CycleRecord, CoupleAnniversarySummary } from '../types/shared';
import { normalizeAnniversarySummary } from '../utils/coupleAnniversaryCalendar';
import WeatherForecast from '../components/ui/WeatherForecast';

const SaleBanner = lazy(() => import('../components/subscription/SaleBanner'));
const CycleChartPanel = lazy(() => import('../components/cycles/CycleChartPanel'));

/* ─── types & helpers ───────────────────────────────── */
interface PartnerCyclesResponse {
  success: boolean;
  insights?: CycleInsights | null;
  cycles?: CycleRecord[];
  partner?: {
    id?: string;
    name?: string;
    avatar?: string;
    gender?: string;
  };
  latestMood?: {
    logDate?: string;
    moodScore?: number;
    label?: string;
    notes?: string;
  } | null;
}

/* ─── greeting helpers ──────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Chào buổi sáng', icon: 'wb_sunny' };
  if (h < 18) return { text: 'Chào buổi chiều', icon: 'partly_cloudy_day' };
  return { text: 'Chào buổi tối', icon: 'nightlight' };
}

/* ─── static data ───────────────────────────────────── */
function toLocalDate(value?: string | null) {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00`) : null;
}

function formatShortDate(value?: string | null) {
  const date = toLocalDate(value);
  return date ? date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--';
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start) return '--';
  return `${formatShortDate(start)}${end ? ` - ${formatShortDate(end)}` : ''}`;
}

function getLocalCalendarDayDifference(target?: string | null, origin = new Date()) {
  if (!target) return null;
  const targetDate = toLocalDate(target);
  if (!targetDate) return null;
  const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const originUtc = Date.UTC(origin.getFullYear(), origin.getMonth(), origin.getDate());
  return Math.round((targetUtc - originUtc) / 86_400_000);
}

function openHiChat(prompt?: string) {
  window.dispatchEvent(new CustomEvent('hi-chat:open', { detail: { prompt } }));
}

/* ─── Main component ─────────────────────────────────── */
export default function FemaleDashboardPage() {
  const { user } = useAuthStore();
  const hasPartner = !!user?.partnerId;
  const [trustOpen, setTrustOpen] = useState(false);

  const firstName = user?.name?.split(' ').pop() ?? 'bạn';
  const greeting  = getGreeting();

  /* ── Cycle query ── */
  const queryClient = useQueryClient();
  const cycleQuery = useQuery({
    queryKey: ['cycles'],
    queryFn: () => api.get('/cycle-records/history', { params: { page: 0, limit: 12 } }).then(({ data }) => ({
      success: true,
      cycles: (data.cycleRecords ?? []) as CycleRecord[],
    })),
  });

  const insightsQuery = useQuery({
    queryKey: ['cycle-insights'],
    queryFn: async () => {
      const { data } = await api.get('/cycle-records/insights');
      return data as { success: boolean; insights: CycleInsights };
    },
  });
  const latestCycle = cycleQuery.data?.cycles?.[0] ?? null;
  const insights = insightsQuery.data?.insights;

  const partnerQuery = useQuery({
    queryKey: ['partner-cycles'],
    queryFn: async () => {
      const { data } = await api.get('/users/partner-cycles');
      return data as PartnerCyclesResponse;
    },
    enabled: hasPartner,
  });

  const anniversariesQuery = useQuery<CoupleAnniversarySummary>({
    queryKey: ['partner-anniversaries'],
    queryFn: () => api.get('/partner/anniversaries').then(({ data }) => normalizeAnniversarySummary(data.anniversaries)),
    enabled: hasPartner,
  });
  const anniversaries = anniversariesQuery.data;
  const partnerName = partnerQuery.data?.partner?.name ?? 'Bạn đời';
  const latestPartnerMood = partnerQuery.data?.latestMood ?? null;
  const partnerMoodLabel = latestPartnerMood?.label
    ?? (typeof latestPartnerMood?.moodScore === 'number'
    ? ['Rất mệt', 'Hơi thấp', 'Ổn định', 'Tích cực', 'Rất vui'][Math.max(1, Math.min(5, latestPartnerMood.moodScore)) - 1]
    : null);
  const confirmedPeriodDay = insights?.confirmedPeriodDay ?? null;
  const phase = insights?.estimatedPhase ?? '—';
  const estimatedPeriodStartDate = insights?.estimatedPeriodStartDate ?? insights?.estimatedNextStartDate;
  const estimatedPeriodEndDate = insights?.estimatedPeriodEndDate ?? insights?.estimatedNextEndDate;
  const fallbackDaysUntilEstimatedPeriod = getLocalCalendarDayDifference(estimatedPeriodStartDate);
  const rawPeriodStatus = insights?.periodStatus ?? 'UPCOMING';
  const periodStatus = rawPeriodStatus === 'PREDICTED' && fallbackDaysUntilEstimatedPeriod !== null && fallbackDaysUntilEstimatedPeriod <= 0
    ? 'DELAYED'
    : rawPeriodStatus;
  const daysUntilEstimatedPeriod = insights?.daysUntilEstimatedPeriod
    ?? (fallbackDaysUntilEstimatedPeriod !== null ? Math.max(fallbackDaysUntilEstimatedPeriod, 0) : null);
  const fallbackEstimatedPeriodDay = getLocalCalendarDayDifference(estimatedPeriodStartDate) ?? 0;
  const estimatedPeriodDay = insights?.estimatedPeriodDay
    ?? (periodStatus === 'PREDICTED' ? Math.max(-fallbackEstimatedPeriodDay + 1, 1) : null);
  const periodDelayDays = periodStatus === 'DELAYED'
    ? insights?.periodDelayDays ?? Math.max(-(fallbackDaysUntilEstimatedPeriod ?? 0), 0)
    : 0;
  const fertilityLabel = insights?.fertilityStatus === 'HIGH'
    ? 'Cao'
    : insights?.fertilityStatus === 'LOW'
      ? 'Thấp'
      : 'Chưa đủ dữ liệu';
  const cycleLen       = Math.round(insights?.averageCycleLength ?? latestCycle?.cycleLength ?? 28);
  const periodLen      = Math.round(insights?.averagePeriodLength ?? latestCycle?.periodLength ?? 5);
  const confidenceLabel = insights?.predictionConfidence === 'HIGH'
    ? 'Cao'
    : insights?.predictionConfidence === 'MEDIUM'
      ? 'Trung bình'
      : 'Đang học dữ liệu';
  const circumference = 251.2;
  const ringProgress = !latestCycle
    ? 0
    : periodStatus === 'CONFIRMED'
      ? Math.min((confirmedPeriodDay ?? 0) / Math.max(periodLen, 1), 1)
      : periodStatus === 'UPCOMING'
        ? Math.min(Math.max((cycleLen - (daysUntilEstimatedPeriod ?? cycleLen)) / Math.max(cycleLen, 1), 0), 1)
        : 1;
  const dashoffset = circumference - ringProgress * circumference;
  const ringValue = !latestCycle
    ? '--'
    : periodStatus === 'CONFIRMED'
      ? confirmedPeriodDay ?? '--'
      : periodStatus === 'UPCOMING'
        ? daysUntilEstimatedPeriod ?? '--'
        : periodStatus === 'PREDICTED'
          ? estimatedPeriodDay ?? '--'
          : periodDelayDays;
  const ringEyebrow = !latestCycle
    ? 'Chưa có dữ liệu'
    : periodStatus === 'CONFIRMED'
      ? 'Ngày kinh nguyệt'
      : periodStatus === 'UPCOMING'
        ? 'Còn'
        : periodStatus === 'PREDICTED'
          ? 'Ngày dự kiến'
          : 'Đã trễ';
  const ringCaption = !latestCycle
    ? 'Thêm kỳ gần nhất'
    : periodStatus === 'CONFIRMED'
      ? 'Đã ghi nhận'
      : periodStatus === 'UPCOMING'
        ? 'ngày nữa tới kỳ'
        : periodStatus === 'PREDICTED'
          ? 'Kỳ kinh ước tính'
          : 'ngày chưa ghi nhận';
  const ringStroke = periodStatus === 'DELAYED' ? '#94a3b8' : periodStatus === 'UPCOMING' ? '#c4b5fd' : '#f472b6';
  /* ── Modal state ── */
  const [dailyLogOpen, setDailyLogOpen] = useState(false);
  const [dailyLogMode, setDailyLogMode] = useState<DailyLogMode>('default');
  const closeDailyLog = () => {
    setDailyLogOpen(false);
    setDailyLogMode('default');
  };
  const openSymptoms = (mode: DailyLogMode = 'default') => {
    setDailyLogMode(mode);
    setDailyLogOpen(true);
  };

  /* ── Cycle history drawer ── */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingHistoryRecord, setEditingHistoryRecord] = useState<CycleRecord | null>(null);
  const openCycleHistory = (record: CycleRecord | null = null) => {
    setEditingHistoryRecord(record);
    setHistoryOpen(true);
  };
  const refreshCycleData = () => {
    queryClient.invalidateQueries({ queryKey: ['cycles'] });
    queryClient.invalidateQueries({ queryKey: ['cycle-insights'] });
  };

  if (user?.gender !== 'female') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden relative font-sans bg-[#fdfbf7]">
      <PageBackdrop variant="female" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── Navbar ── */}
        <Navbar />

        {/* ── Main ── */}
        <main className="flex-grow pt-6 pb-16 px-4 md:px-8 max-w-[1400px] mx-auto w-full">

          {/* Greeting row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                <span className="material-symbols-outlined text-yellow-500 text-[20px]">{greeting.icon}</span>
                <span>{greeting.text}</span>
              </div>
              <h1 className="hi-page-title text-3xl md:text-4xl flex flex-wrap items-center gap-2">
                <span>{firstName}</span>                <span className="font-normal text-slate-400">,</span>
                <span
                  className="font-medium"
                  style={{
                    background: 'linear-gradient(90deg, #e9638f, #a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    display: 'inline-block',
                    paddingBottom: '0.15em',
                    marginBottom: '-0.15em',
                  }}
                >
                  hôm nay bạn tỏa sáng! ✨
                </span>
              </h1>
            </div>
            <WeatherForecast compact />
          </div>

          <Suspense fallback={null}><SaleBanner /></Suspense>

          {/* ── Card grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* ── 1. Cycle Status ── */}
            <div className="md:col-span-3 bg-white/90 backdrop-blur-sm rounded-3xl p-7 relative overflow-hidden shadow-sm border border-white/80">
              <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-pink-100 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-pink-400 text-[22px]">water_drop</span>
                    Trạng thái chu kỳ
                  </h3>
                  <p className="text-slate-400 text-sm">Cập nhật lúc 8:00 sáng nay</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/cycles" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-pink-500 bg-slate-50 hover:bg-pink-50 px-3 py-1.5 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Xem lịch sử
                  </Link>
                  <button
                    onClick={() => openCycleHistory(latestCycle)}
                    disabled={!latestCycle}
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-pink-50 flex items-center justify-center text-slate-400 hover:text-pink-500 transition-colors"
                    aria-label="Sửa kỳ kinh gần nhất"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                </div>
              </div>

              <div className="relative z-10 space-y-5">
                  <div className="flex flex-col items-center gap-6 md:flex-row">
                    <div className="relative size-52 flex-shrink-0 md:size-56">
                      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke={ringStroke} strokeWidth="8"
                          strokeDasharray={periodStatus === 'PREDICTED' ? '10 7' : circumference}
                          strokeDashoffset={dashoffset} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{ringEyebrow}</span>
                        <span className="text-5xl font-extrabold text-slate-900">{ringValue}</span>
                        <span className={`mt-1 text-sm font-bold ${periodStatus === 'DELAYED' ? 'text-slate-500' : 'text-pink-500'}`}>{ringCaption}</span>
                      </div>
                    </div>

                    <div className="flex-1 rounded-3xl border border-slate-100 bg-gradient-to-br from-rose-50/70 via-white to-sky-50/50 p-4">
                      <CyclePreviewCalendar cycles={cycleQuery.data?.cycles ?? []} insights={insights} />
                      <div className="hidden gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <div className="rounded-2xl border border-rose-100 bg-white p-3.5 shadow-sm">
                          <div className="flex items-center gap-2 text-rose-500">
                            <span className="material-symbols-outlined text-[18px]">event_available</span>
                            <p className="text-[10px] font-black uppercase tracking-wide">Kỳ gần nhất</p>
                          </div>
                          <p className="mt-2 text-base font-extrabold text-slate-800">{formatDateRange(insights?.lastRecordedStartDate, insights?.lastRecordedEndDate)}</p>
                          <p className="mt-1 text-[11px] font-bold text-rose-500">{latestCycle ? 'Đã ghi nhận' : 'Chưa có dữ liệu'}</p>
                        </div>
                        <div className="flex items-center justify-center gap-2 sm:flex-col">
                          <span className="h-px w-6 bg-rose-200 sm:h-6 sm:w-px" />
                          <span className="whitespace-nowrap rounded-full border border-rose-100 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm">{cycleLen} ngày</span>
                          <span className="h-px w-6 bg-rose-200 sm:h-6 sm:w-px" />
                        </div>
                        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 p-3.5">
                          <div className="flex items-center gap-2 text-rose-500">
                            <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                            <p className="text-[10px] font-black uppercase tracking-wide">Kỳ tiếp theo</p>
                          </div>
                          <p className="mt-2 text-base font-extrabold text-slate-800">{formatDateRange(estimatedPeriodStartDate, estimatedPeriodEndDate)}</p>
                          <p className="mt-1 text-[11px] font-bold text-rose-400">Ước tính</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 shadow-sm">{periodLen} ngày kinh trung bình</span>
                        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 shadow-sm">Tin cậy: {confidenceLabel}</span>
                        {(insights?.cycleCount ?? 0) < 3 && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700">Cần thêm lịch sử</span>}
                        {insights?.estimatedOvulationDate && <span className="rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-700">Rụng trứng ước tính: {formatShortDate(insights.estimatedOvulationDate)}</span>}
                        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700">Khả năng thụ thai ước tính: {fertilityLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-slate-600">
                      {!latestCycle
                        ? 'Thêm kỳ gần nhất để bắt đầu nhận dự đoán chu kỳ.'
                        : periodStatus === 'UPCOMING'
                        ? `Kỳ tiếp theo dự kiến sau ${daysUntilEstimatedPeriod ?? '--'} ngày. Giai đoạn hiện tại: ước tính ${phase.toLowerCase()}.`
                        : periodStatus === 'CONFIRMED'
                          ? `Đã ghi nhận ngày ${confirmedPeriodDay} của kỳ kinh hiện tại.`
                          : periodStatus === 'PREDICTED'
                            ? 'Bạn đang ở trong cửa sổ kỳ kinh dự kiến. Chỉ xác nhận khi kỳ kinh thực sự bắt đầu.'
                            : 'Kỳ kinh chưa được ghi nhận sau ngày dự kiến. Hãy cập nhật khi kỳ kinh bắt đầu.'}
                    </p>
                    <span className="whitespace-nowrap font-bold text-rose-600">Dự đoán tham khảo</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button onClick={() => openSymptoms(periodStatus === 'CONFIRMED' ? 'default' : 'periodStart')} className="hi-btn-primary rounded-xl px-4 py-3 text-sm font-bold">
                      {periodStatus === 'CONFIRMED' ? 'Ghi triệu chứng hôm nay' : 'Bắt đầu kỳ hôm nay'}
                    </button>
                    <button onClick={() => openCycleHistory()} className="hi-btn-secondary rounded-xl px-4 py-3 text-sm font-bold">
                      Thêm lịch sử
                    </button>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    Ngày dự kiến chỉ là ước tính, không thay thế biện pháp tránh thai hoặc tư vấn y khoa.
                  </p>
              </div>
            </div>

            {/* ── 2. Partner card ── */}
            <div className="md:col-span-1 space-y-4">
            <div className="bg-gradient-to-b from-blue-50 to-white rounded-3xl p-5 shadow-sm border border-blue-100 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-blue-200/20 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[22px]">favorite</span>
                    Người ấy
                  </h3>
                  {hasPartner && (
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                  )}
                </div>

                {hasPartner ? (
                  <div className="flex flex-col items-center text-center mb-5">
                    <div className="relative mb-3">
                      <div className="size-20 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-white">person</span>
                      </div>
                      <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-sm">
                        <span className="material-symbols-outlined text-pink-500 text-sm">notifications_active</span>
                      </div>
                    </div>
                    <h4 className="font-bold text-lg text-slate-900">{partnerName}</h4>
                    <p className="text-xs text-slate-400">Đã kết nối</p>
                    {anniversaries?.daysTogether !== undefined && anniversaries?.daysTogether !== null && (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-pink-600 border border-pink-100 text-xs font-black">
                        <span className="material-symbols-outlined text-sm">favorite</span>
                        {anniversaries.startDate?.title || 'Đồng hành'}{' '}
                        <span
                          className="px-0.5 text-2xl font-black leading-none"
                          style={{
                            background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            display: 'inline-block',
                          }}
                        >
                          {anniversaries.daysTogether}
                        </span>{' '}
                        ngày
                      </div>
                    )}
                    <div className="mt-4 w-full rounded-2xl border border-white bg-white/80 p-3.5 shadow-sm backdrop-blur-sm">
                      <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Cảm xúc mới nhất</p>
                      {partnerMoodLabel ? (
                        <div className="flex items-start gap-3 text-left">
                          <span className="material-symbols-outlined text-xl text-amber-400">sentiment_satisfied</span>
                          <div>
                            <p className="text-sm font-bold text-slate-700">{partnerMoodLabel}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                              {latestPartnerMood?.logDate
                                ? new Date(`${latestPartnerMood.logDate}T00:00:00`).toLocaleDateString('vi-VN')
                                : 'Hôm nay'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold leading-snug text-slate-500">
                          Chưa có cảm xúc được chia sẻ hôm nay.
                        </p>
                      )}
                    </div>
                    <PartnerQuestionPreview enabled={hasPartner} variant="female" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-6 gap-3">
                    <div className="size-16 rounded-full bg-blue-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-blue-300">person_add</span>
                    </div>
                    <p className="text-sm text-slate-500">Chưa kết nối với ai</p>
                    <Link to="/settings/notifications" className="text-xs font-bold text-blue-500 hover:underline">
                      Kết nối ngay →
                    </Link>
                  </div>
                )}
              </div>
              <button
                onClick={() => openHiChat(`Gửi một lời nhắn quan tâm cho ${partnerName}`)}
                className="hi-btn-secondary w-full rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                Gửi lời nhắn
              </button>
            </div>
            <QuickMoodCard sendToPartner={hasPartner} />
            </div>

            {/* ── 7. Community FAQ (full width) ── */}
            <div className="md:col-span-4 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-500">Báo cáo chu kỳ & sức khỏe</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">{insights?.regularityLabel ?? 'Chưa đủ dữ liệu'}</h3>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                    Hi đánh giá dựa trên các kỳ đã xác nhận, xu hướng độ dài chu kỳ và nhật ký triệu chứng. Đây là thông tin tham khảo, không phải chẩn đoán.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTrustOpen(true)}
                  className="rounded-full border border-pink-100 bg-pink-50 px-4 py-2 text-xs font-black text-pink-600 transition hover:-translate-y-0.5 hover:bg-pink-100"
                >
                  Hi tính toán thế nào?
                </button>
              </div>
              {insights?.advancedAnalyticsAvailable ? (
                <>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="h-64 rounded-3xl border border-pink-50 bg-gradient-to-br from-white to-pink-50/40 p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-pink-400">Xu hướng chu kỳ</p>
                  <Suspense fallback={<div className="h-full animate-pulse rounded-2xl bg-pink-50" />}>
                    <CycleChartPanel kind="trend" insights={insights} avgLen={cycleLen} avgPeriod={periodLen} />
                  </Suspense>
                </div>
                <div className="h-64 rounded-3xl border border-sky-50 bg-gradient-to-br from-white to-sky-50/50 p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-sky-500">Lịch sử gần đây</p>
                  <Suspense fallback={<div className="h-full animate-pulse rounded-2xl bg-sky-50" />}>
                    <CycleChartPanel kind="length-bars" cycles={cycleQuery.data?.cycles ?? []} />
                  </Suspense>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-3xl bg-gradient-to-br from-pink-50 to-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-pink-400">Tính đều đặn</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{insights?.regularityScore ?? 0}%</p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-sky-500">Độ tin cậy</p>
                  <p className="mt-2 text-xl font-black text-slate-900">{confidenceLabel}</p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-500">Rụng trứng ước tính</p>
                  <p className="mt-2 text-xl font-black text-slate-900">{formatShortDate(insights?.estimatedOvulationDate)}</p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Xu hướng chu kỳ</p>
                  <div className="mt-3 flex h-10 items-end gap-1">
                    {(insights?.cycleTrendPoints ?? []).slice(-6).map((point, index) => (
                      <span key={`${point.startDate}-${index}`} className="w-full rounded-t-lg bg-gradient-to-t from-pink-300 to-sky-300" style={{ height: `${Math.min(Math.max((point.cycleLength ?? 28) * 1.2, 18), 40)}px` }} />
                    ))}
                    {(insights?.cycleTrendPoints ?? []).length === 0 && <span className="text-xs font-bold text-slate-400">Cần thêm lịch sử</span>}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(insights?.regularityReasons ?? ['Nhập ít nhất 3 kỳ gần nhất để Hi đánh giá ổn hơn.']).slice(0, 3).map((reason) => (
                  <span key={reason} className="rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">{reason}</span>
                ))}
                <Link to="/cycles" className="hi-btn-primary rounded-full px-4 py-2 text-xs font-black">
                  Xem chi tiết
                </Link>
              </div>
                </>
              ) : (
                <div className="mt-5 space-y-3">
                  <PremiumLockCard
                    compact
                    title="Mở phân tích chu kỳ chuyên sâu"
                    description="Một người trong cặp đôi mua Hi Pro hoặc Hi Max, cả hai cùng dùng phân tích nâng cao."
                  />
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-violet-500">Rụng trứng ước tính</p>
                    <p className="mt-2 text-xl font-black text-slate-900">{formatShortDate(insights?.estimatedOvulationDate)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-4 bg-white/90 backdrop-blur-sm rounded-3xl p-7 shadow-sm border border-white/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Câu hỏi thường gặp</h3>
                  <p className="text-slate-500 text-sm">Cộng đồng đang thảo luận gì?</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-400">Chủ đề hot:</span>
                  {['#ChuKy', '#SucKhoe', '#TinhYeu'].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-slate-600 cursor-pointer hover:bg-pink-50 hover:text-pink-600 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    cat: 'Sức khỏe',
                    q: 'Tại sao tôi cảm thấy đau lưng khi rụng trứng?',
                    desc: 'Đau lưng giữa chu kỳ thường do sự thay đổi nội tiết tố và nang trứng vỡ ra...',
                  },
                  {
                    cat: 'Dinh dưỡng',
                    q: 'Thực phẩm nên ăn để tăng khả năng thụ thai?',
                    desc: 'Các loại đậu, rau lá xanh đậm và chất béo lành mạnh là chìa khóa...',
                  },
                ].map(({ cat, q, desc }) => (
                  <button
                    key={q}
                    onClick={() => openHiChat(q)}
                    className="group p-4 rounded-2xl bg-gray-50 hover:bg-pink-50/50 border border-transparent hover:border-pink-100 transition-all cursor-pointer text-left w-full"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-white rounded-md text-[10px] font-bold text-pink-500 shadow-sm border border-pink-100">
                        {cat}
                      </span>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-pink-400 transition-colors text-[18px]">
                        arrow_outward
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1 group-hover:text-pink-600 transition-colors text-sm">{q}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{desc}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => openHiChat('Các tính năng của Hi là gì?')}
                className="block w-full mt-5 py-3 border border-gray-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600 transition-all text-center"
              >
                Khám phá thêm cùng Hi AI
              </button>
            </div>

            {/* ── 8. Curated health videos ── */}
            <HealthVideoSection />

            <div className="md:col-span-4">
              <AffiliateRecommendations
                compact
                phase={insights?.estimatedPhase ?? insights?.currentPhase ?? undefined}
                symptomCategory="đau bụng"
              />
            </div>

            {/* ── 9. Upgrade Plans (full width) ── */}
            <div className="md:col-span-4">
              <PricingCard />
            </div>

          </div>
        </main>

      </div>

      {/* ═══ Panels ═══ */}

      <CycleHistoryDrawer
        open={historyOpen}
        cycles={cycleQuery.data?.cycles ?? []}
        insights={insights}
        editingRecord={editingHistoryRecord}
        onClose={() => setHistoryOpen(false)}
        onSaved={refreshCycleData}
      />

      <DailyLogModal
        open={dailyLogOpen}
        mode={dailyLogMode}
        onClose={closeDailyLog}
        onSaved={refreshCycleData}
      />

      <HiTrustExplainer open={trustOpen} onClose={() => setTrustOpen(false)} accent="rose" />

    </div>
  );
}



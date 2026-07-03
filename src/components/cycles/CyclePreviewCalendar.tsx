import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuthStore } from '../../store/authStore';
import type { CycleInsights, CycleRecord, CoupleAnniversarySummary, CoupleAnniversaryColor, DailyLog, CoupleQuestionHistory, CoupleQuestionSession } from '../../types/shared';
import {
  CYCLE_DAY_CLASSES,
  CYCLE_LEGEND,
  getCalendarAnchor,
  getCalendarRange,
  getCycleDayKind,
  toIsoDate,
} from '../../utils/cycleCalendar';
import {
  getDayAnniversaryOccurrences,
  anniversaryEffectClass,
} from '../../utils/coupleAnniversaryCalendar';
import { AnniversarySticker } from '../partner/AnniversaryVisuals';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const CYCLE_KIND_LABELS: Record<string, string> = {
  recorded: 'Kỳ kinh đã ghi nhận',
  predicted: 'Kỳ kinh dự đoán',
  fertile: 'Cửa sổ thụ thai',
  ovulation: 'Ngày rụng trứng',
  delayed: 'Chu kỳ đang trễ',
};

const FLOW_LABELS: Record<string, string> = {
  NONE: 'Không ghi nhận lượng kinh',
  LIGHT: 'Lượng kinh ít',
  MEDIUM: 'Lượng kinh vừa',
  HEAVY: 'Lượng kinh nhiều',
};

const ANNIVERSARY_BORDER_CLASSES: Record<CoupleAnniversaryColor, string> = {
  pink: 'border-pink-500 border-2 border-solid shadow-[0_0_8px_rgba(244,114,182,0.4)]',
  rose: 'border-rose-500 border-2 border-solid shadow-[0_0_8px_rgba(244,63,94,0.4)]',
  violet: 'border-violet-500 border-2 border-solid shadow-[0_0_8px_rgba(139,92,246,0.4)]',
  sky: 'border-sky-500 border-2 border-solid shadow-[0_0_8px_rgba(14,165,233,0.4)]',
  emerald: 'border-emerald-500 border-2 border-solid shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  amber: 'border-amber-500 border-2 border-solid shadow-[0_0_8px_rgba(245,158,11,0.4)]',
};

interface CyclePreviewCalendarProps {
  cycles: CycleRecord[];
  insights?: CycleInsights | null;
  className?: string;
  shareDetailedSymptoms?: boolean;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

function wasAnswerEdited(answer?: { answeredAt?: string; updatedAt?: string } | null) {
  if (!answer?.answeredAt || !answer.updatedAt) return false;
  return new Date(answer.updatedAt).getTime() > new Date(answer.answeredAt).getTime();
}

export default function CyclePreviewCalendar({ cycles, insights, className = '', shareDetailedSymptoms = true }: CyclePreviewCalendarProps) {
  const { user } = useAuthStore();
  const { data: subscription } = useSubscription();
  const hasPartner = !!user?.partnerId;
  const hasCouplePremium = subscription?.couplePremium === true;
  const [weeksOffset, setWeeksOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const anniversariesQuery = useQuery<CoupleAnniversarySummary>({
    queryKey: ['partner-anniversaries'],
    queryFn: () => api.get('/partner/anniversaries').then(({ data }) => data.anniversaries),
    enabled: hasPartner,
    staleTime: 5 * 60 * 1000,
  });
  const anniversaries = anniversariesQuery.data;

  const baseAnchor = getCalendarAnchor(insights, cycles);
  const anchor = useMemo(() => {
    return new Date(baseAnchor.getFullYear(), baseAnchor.getMonth(), baseAnchor.getDate() + weeksOffset * 7);
  }, [baseAnchor, weeksOffset]);

  const days = useMemo(() => getCalendarRange(anchor, 3), [anchor]);
  const rangeFrom = useMemo(() => toIsoDate(days[0]), [days]);
  const rangeTo = useMemo(() => toIsoDate(days[days.length - 1]), [days]);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const dailyLogsQuery = useQuery<DailyLog[]>({
    queryKey: [user?.gender === 'female' ? 'daily-logs' : 'partner-daily-logs', rangeFrom, rangeTo],
    queryFn: () => {
      const url = user?.gender === 'female' ? '/daily-logs' : '/daily-logs/partner';
      return api.get(url, { params: { from: rangeFrom, to: rangeTo } })
        .then(({ data }) => data.dailyLogs ?? []);
    },
    enabled: !!user && (user.gender === 'female' || (user.gender === 'male' && !!user.partnerId && shareDetailedSymptoms)),
    staleTime: 60_000,
  });

  const dailyLogsByDate = useMemo(
    () => new Map((dailyLogsQuery.data ?? []).map((log) => [log.logDate.slice(0, 10), log])),
    [dailyLogsQuery.data],
  );

  const questionsQuery = useQuery<CoupleQuestionHistory>({
    queryKey: ['couple-questions-range', rangeFrom, rangeTo],
    queryFn: () => api.get('/partner/questions/history', {
      params: { from: rangeFrom, to: rangeTo, page: 0, limit: 62 }
    }).then(({ data }) => data.history),
    enabled: hasPartner && hasCouplePremium,
    staleTime: 5 * 60 * 1000,
  });

  const questionMap = useMemo(() => {
    const map = new Map<string, CoupleQuestionSession>();
    if (questionsQuery.data?.items) {
      questionsQuery.data.items.forEach((item) => {
        if (item.questionDate) {
          const dateStr = item.questionDate.slice(0, 10);
          map.set(dateStr, item);
        }
      });
    }
    return map;
  }, [questionsQuery.data]);

  const daysData = useMemo(() => {
    return days.map((date) => {
      const iso = toIsoDate(date);
      const kind = getCycleDayKind(date, cycles, insights);
      const isToday = iso === todayIso;
      const occurrences = getDayAnniversaryOccurrences(anniversaries, iso, date.getFullYear(), date.getMonth());
      const primary = occurrences[0];
      const event = primary?.event;
      const decorated = Boolean(primary && event);
      const dailyLog = dailyLogsByDate.get(iso);
      const symptomNames = dailyLog?.symptoms
        ?.map((symptom) => symptom.symptomName)
        .filter((name): name is string => Boolean(name)) ?? [];
      const question = questionMap.get(iso);
      const hasDetails = Boolean(kind || dailyLog || occurrences.length > 0 || question);
      const dayOfWeek = date.getDay();
      const tooltipPosition = dayOfWeek === 0 || dayOfWeek === 6
        ? 'right-0'
        : dayOfWeek === 1 || dayOfWeek === 2
          ? 'left-0'
          : 'left-1/2 -translate-x-1/2';

      let cellClass = '';
      if (kind) {
        if (decorated) {
          if (kind === 'recorded') {
            cellClass = 'bg-rose-200 text-rose-800';
          } else if (kind === 'predicted') {
            cellClass = 'bg-white text-rose-500';
          } else if (kind === 'fertile') {
            cellClass = 'bg-sky-50 text-sky-700';
          } else if (kind === 'ovulation') {
            cellClass = 'bg-sky-200 text-sky-900';
          } else if (kind === 'delayed') {
            cellClass = 'bg-slate-100 text-slate-500';
          }
        } else {
          cellClass = kind === 'predicted' ? CYCLE_DAY_CLASSES[kind] : `${CYCLE_DAY_CLASSES[kind]} border-transparent`;
        }
      } else {
        if (decorated) {
          cellClass = 'bg-slate-50/80 text-slate-500';
        } else {
          cellClass = 'border-slate-50/50 bg-slate-50/80 text-slate-500';
        }
      }

      const borderClass = decorated
        ? `${ANNIVERSARY_BORDER_CLASSES[event.color ?? 'pink']} ${anniversaryEffectClass(event.effect)}`
        : '';

      return {
        date,
        iso,
        kind,
        isToday,
        occurrences,
        event,
        decorated,
        dailyLog,
        symptomNames,
        question,
        hasDetails,
        tooltipPosition,
        cellClass,
        borderClass
      };
    });
  }, [days, cycles, insights, anniversaries, dailyLogsByDate, questionMap, todayIso]);

  const monthCounts = useMemo(() => {
    return days.reduce((acc, date) => {
      const label = monthLabel(date);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [days]);

  const shownMonths = useMemo(() => {
    const keys = Object.keys(monthCounts);
    if (keys.length === 0) return '';
    return keys.reduce((a, b) =>
      monthCounts[a] >= monthCounts[b] ? a : b
    );
  }, [monthCounts]);

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return daysData.find((d) => d.iso === selectedDate);
  }, [daysData, selectedDate]);

  const moveWeeks = (amount: number) => {
    setWeeksOffset((current) => current + amount);
    setSelectedDate(null);
  };

  return (
    <div className={`rounded-[2rem] border border-rose-100/70 bg-white/80 p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Lịch chu kỳ</p>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-extrabold text-slate-900">{shownMonths}</h4>
            {weeksOffset !== 0 && (
              <button
                type="button"
                onClick={() => {
                  setWeeksOffset(0);
                  setSelectedDate(null);
                }}
                className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-all border border-rose-100/50 shadow-sm active:scale-95 cursor-pointer"
              >
                Hôm nay
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] font-semibold text-slate-400">Dự đoán chỉ mang tính tham khảo</p>
      </div>

      <div className="relative px-7">
        {/* Nút lướt về sau (quá khứ) */}
        <button
          type="button"
          onClick={() => moveWeeks(-3)}
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 text-rose-500 hover:text-rose-600 active:scale-90 transition-all select-none z-10 cursor-pointer"
          aria-label="Previous weeks"
        >
          <span className="material-symbols-outlined font-black text-3xl">chevron_left</span>
        </button>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1 text-center text-[10px] font-extrabold text-slate-400">
              {day}
            </div>
          ))}
          {daysData.map((day) => {
            const {
              date,
              iso,
              kind,
              isToday,
              occurrences,
              event,
              decorated,
              dailyLog,
              symptomNames,
              question,
              hasDetails,
              tooltipPosition,
              cellClass,
              borderClass
            } = day;

            return (
              <button
                type="button"
                key={iso}
                onClick={() => setSelectedDate((current) => current === iso ? null : iso)}
                aria-pressed={selectedDate === iso}
                aria-label={`Xem chi tiết ngày ${date.toLocaleDateString('vi-VN')}`}
                className={[
                  'group relative flex aspect-square min-h-[40px] items-center justify-center rounded-xl border text-xs font-extrabold transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:aspect-[1.25] sm:min-h-10 sm:rounded-2xl sm:text-sm',
                  cellClass,
                  borderClass,
                  isToday ? 'outline outline-2 outline-slate-800 outline-offset-2' : '',
                  selectedDate === iso ? 'ring-2 ring-pink-400 ring-offset-2' : '',
                ].join(' ')}
              >
                {date.getDate()}
                {decorated && (
                  <span className="anniversary-icon absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-slate-100 bg-white shadow-sm sm:size-6">
                    <AnniversarySticker name={event.sticker} size={16} />
                  </span>
                )}

                {/* Question status indicator dot */}
                {question && (
                  <span className="absolute bottom-1 flex gap-0.5 justify-center">
                    <span className={[
                      "h-1.5 w-1.5 rounded-full",
                      question.status === 'UNANSWERED' ? 'bg-slate-400' : '',
                      question.status === 'WAITING_PARTNER' ? 'bg-amber-400 animate-pulse' : '',
                      question.status === 'UNLOCKED' ? 'bg-emerald-500' : '',
                    ].join(' ')} />
                  </span>
                )}

                {hasDetails && (
                  <span className={`pointer-events-none absolute bottom-[calc(100%+8px)] z-40 hidden w-60 rounded-xl border border-slate-200 bg-white p-3 text-left font-normal text-slate-600 shadow-xl opacity-0 transition group-hover:opacity-100 sm:block ${tooltipPosition}`}>
                    <strong className="block text-xs font-extrabold text-slate-900">
                      {date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    </strong>
                    {kind && <span className="mt-1 block text-[11px] font-bold text-pink-600">{CYCLE_KIND_LABELS[kind] ?? 'Theo dõi chu kỳ'}</span>}
                    {dailyLog && (
                      <span className="mt-2 block">
                        <span className="block text-[11px] font-bold text-slate-700">{FLOW_LABELS[dailyLog.flowIntensity] ?? 'Nhật ký sức khỏe'}</span>
                        {symptomNames.length > 0 && (
                          <span className="mt-1 block text-[11px] leading-relaxed">{symptomNames.slice(0, 4).join(', ')}{symptomNames.length > 4 ? ` và ${symptomNames.length - 4} triệu chứng khác` : ''}</span>
                        )}
                      </span>
                    )}
                    {occurrences.map((occurrence) => (
                      <span key={occurrence.key} className="mt-2 flex items-start gap-2 border-t border-slate-100 pt-2">
                        <AnniversarySticker name={occurrence.event.sticker} size={20} className="shrink-0" />
                        <span>
                          <strong className="block text-[11px] text-slate-800">{occurrence.event.title}</strong>
                          {occurrence.event.note && <span className="mt-0.5 block text-[10px] leading-relaxed">{occurrence.event.note}</span>}
                        </span>
                      </span>
                    ))}
                    {question && (
                      <span className="mt-2 flex flex-col gap-0.5 border-t border-slate-100 pt-2">
                        <strong className="block text-[11px] font-extrabold text-slate-800">Câu hỏi cặp đôi</strong>
                        <span className="truncate block text-[10px] text-slate-500 italic">“{question.questionText}”</span>
                        <span className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold">
                          {question.status === 'UNANSWERED' && <span className="text-slate-400">• Chưa trả lời</span>}
                          {question.status === 'WAITING_PARTNER' && <span className="text-amber-500">• Chờ Người ấy</span>}
                          {question.status === 'UNLOCKED' && <span className="text-emerald-500">• Đã mở</span>}
                          {wasAnswerEdited(question.myAnswer) && (
                            <span className="text-sky-500 font-normal ml-1">(Đã chỉnh sửa)</span>
                          )}
                        </span>
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nút lướt tới (tương lai) */}
        <button
          type="button"
          onClick={() => moveWeeks(3)}
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 text-rose-500 hover:text-rose-600 active:scale-90 transition-all select-none z-10 cursor-pointer"
          aria-label="Next weeks"
        >
          <span className="material-symbols-outlined font-black text-3xl">chevron_right</span>
        </button>
      </div>

      {selectedDayData && (
        <section className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-5 space-y-4" aria-live="polite">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-rose-100/50 pb-3">
            <div>
              <p className="text-sm font-extrabold capitalize text-slate-900">
                {selectedDayData.date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {selectedDayData.kind ? CYCLE_KIND_LABELS[selectedDayData.kind] ?? 'Theo dõi chu kỳ' : 'Ngoài các mốc dự đoán chu kỳ'}
              </p>
            </div>
            {selectedDayData.dailyLog?.flowIntensity && selectedDayData.dailyLog.flowIntensity !== 'NONE' && (
              <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-rose-600 shadow-sm border border-rose-100">
                {FLOW_LABELS[selectedDayData.dailyLog.flowIntensity]}
              </span>
            )}
          </div>

          {/* Unified Details Layout */}
          <div className="space-y-4">
            {/* Symptoms */}
            {(user?.gender === 'female' || shareDetailedSymptoms) && (
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Triệu chứng</p>
                {selectedDayData.dailyLog?.symptoms?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedDayData.dailyLog.symptoms.map((symptom) => (
                      <span key={symptom._id} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-100/30">
                        {symptom.symptomName || `Triệu chứng #${symptom.symptomId}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-slate-400">Không ghi nhận triệu chứng.</p>
                )}
                {selectedDayData.dailyLog?.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 bg-white/55 p-2.5 rounded-xl border border-white">
                    {selectedDayData.dailyLog.notes}
                  </p>
                )}
              </div>
            )}

            {/* Anniversaries */}
            {selectedDayData.occurrences.length > 0 && (
              <div className="border-t border-rose-100/30 pt-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Kỷ niệm & Ngày đặc biệt</p>
                <div className="mt-2 space-y-2">
                  {selectedDayData.occurrences.map((occurrence) => (
                    <div key={occurrence.key} className="flex items-center gap-2.5 bg-white/40 p-2 rounded-xl border border-white/65">
                      <AnniversarySticker name={occurrence.event.sticker} size={24} className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 leading-tight">{occurrence.event.title}</p>
                        {occurrence.event.note && (
                          <p className="mt-0.5 text-xs text-slate-500 truncate">{occurrence.event.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Couple Questions */}
            {selectedDayData.question && (
              <div className="border-t border-rose-100/30 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Câu hỏi của chúng mình</p>
                  <span className={[
                    "text-[10px] px-2 py-0.5 rounded-full font-bold border",
                    selectedDayData.question.status === 'UNANSWERED' ? 'bg-slate-100 text-slate-500 border-slate-200' : '',
                    selectedDayData.question.status === 'WAITING_PARTNER' ? 'bg-amber-50 text-amber-600 border-amber-100' : '',
                    selectedDayData.question.status === 'UNLOCKED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : '',
                  ].join(' ')}>
                    {selectedDayData.question.status === 'UNANSWERED' ? 'Chưa trả lời' : ''}
                    {selectedDayData.question.status === 'WAITING_PARTNER' ? 'Chờ Người ấy' : ''}
                    {selectedDayData.question.status === 'UNLOCKED' ? 'Đã mở khóa' : ''}
                  </span>
                </div>
                <div className="mt-2 bg-white/60 p-3 rounded-xl border border-white/80">
                  <p className="text-xs font-black text-slate-800">“{selectedDayData.question.questionText}”</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Chủ đề: {selectedDayData.question.category}</p>

                  {/* Answers if unlocked */}
                  {selectedDayData.question.status === 'UNLOCKED' && (
                    <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-2.5">
                      {selectedDayData.question.myAnswer && (
                        <div className="text-xs">
                          <span className="font-extrabold text-rose-600">Bạn:</span>{' '}
                          <span className="text-slate-700">{selectedDayData.question.myAnswer.content}</span>
                          {wasAnswerEdited(selectedDayData.question.myAnswer) && (
                            <span className="text-[10px] text-slate-400 ml-1.5">(Đã chỉnh sửa)</span>
                          )}
                        </div>
                      )}
                      {selectedDayData.question.partnerAnswer && (
                        <div className="text-xs">
                          <span className="font-extrabold text-blue-600">Người ấy:</span>{' '}
                          <span className="text-slate-700">{selectedDayData.question.partnerAnswer.content}</span>
                          {wasAnswerEdited(selectedDayData.question.partnerAnswer) && (
                            <span className="text-[10px] text-slate-400 ml-1.5">(Đã chỉnh sửa)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {CYCLE_LEGEND.map((item) => (
          <span key={item.kind} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span className={`size-2.5 rounded-full ${item.dotClassName}`} />
            {item.label}
          </span>
        ))}
        {hasPartner && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 border-l border-slate-200/50 pl-4">
            <span className="size-2.5 rounded-full bg-pink-400" />
            Ngày đặc biệt / Kỷ niệm
          </span>
        )}
      </div>
    </div>
  );
}

import type { CycleInsights, CycleRecord } from '../types/shared';

export type CycleDayKind = 'recorded' | 'predicted' | 'fertile' | 'ovulation' | 'delayed';

export const CYCLE_DAY_CLASSES: Record<CycleDayKind, string> = {
  recorded: 'bg-rose-200 text-rose-800 ring-1 ring-rose-200',
  predicted: 'border border-dashed border-rose-300 bg-white text-rose-500',
  fertile: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
  ovulation: 'bg-sky-200 text-sky-900 ring-1 ring-sky-300',
  delayed: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

export const CYCLE_LEGEND = [
  { kind: 'recorded' as const, label: 'Kỳ đã ghi', dotClassName: 'bg-rose-200 ring-1 ring-rose-200' },
  { kind: 'predicted' as const, label: 'Kỳ dự đoán', dotClassName: 'border border-dashed border-rose-300 bg-white' },
  { kind: 'ovulation' as const, label: 'Rụng trứng', dotClassName: 'bg-sky-200 ring-1 ring-sky-300' },
  { kind: 'fertile' as const, label: 'Cửa sổ thụ thai', dotClassName: 'bg-sky-50 ring-1 ring-sky-100' },
  { kind: 'delayed' as const, label: 'Trễ', dotClassName: 'bg-slate-100 ring-1 ring-slate-200' },
];

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function fromIsoDate(value?: string | null) {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00`) : null;
}

export function addDays(value: string, amount: number) {
  const date = fromIsoDate(value);
  if (!date) return value;
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount));
}

export function isWithinIso(dateIso: string, startDate?: string | null, endDate?: string | null) {
  if (!startDate) return false;
  const start = startDate.slice(0, 10);
  const end = (endDate ?? startDate).slice(0, 10);
  return dateIso >= start && dateIso <= end;
}

function getRecordedPeriodEnd(cycle: CycleRecord, insights?: CycleInsights | null) {
  const start = cycle.startDate.slice(0, 10);
  if (cycle.endDate) return cycle.endDate.slice(0, 10);
  const isOngoing = cycle.status === 'ONGOING' || cycle.status === 'NEEDS_CONFIRMATION'
    || (insights?.periodOngoing && insights.lastRecordedStartDate?.slice(0, 10) === start);
  if (isOngoing) {
    return cycle.lastBleedingDate?.slice(0, 10) ?? addDays(start, Math.max(cycle.periodLength || 1, 1) - 1);
  }
  const estimatedLength = Math.round(insights?.averagePeriodLength || cycle.periodLength || 5);
  return addDays(start, Math.max(estimatedLength, 1) - 1);
}

function isCloseToRecorded(dateIso: string, cycles: CycleRecord[], insights?: CycleInsights | null) {
  const date = fromIsoDate(dateIso);
  if (!date) return false;
  const dateTime = date.getTime();

  for (const cycle of cycles) {
    const start = cycle.startDate.slice(0, 10);
    const end = getRecordedPeriodEnd(cycle, insights);

    const startDate = fromIsoDate(start);
    const endDate = fromIsoDate(end);
    if (!startDate || !endDate) continue;

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const dayMs = 86_400_000;

    if (dateTime > endMs) {
      if ((dateTime - endMs) / dayMs < 15) return true;
    } else if (dateTime < startMs) {
      if ((startMs - dateTime) / dayMs < 15) return true;
    } else {
      return true;
    }
  }
  return false;
}

export function getCycleDayKind(date: Date, cycles: CycleRecord[], insights?: CycleInsights | null): CycleDayKind | null {
  const dateIso = toIsoDate(date);
  const todayIso = toIsoDate(new Date());

  for (const cycle of cycles) {
    const start = cycle.startDate.slice(0, 10);
    const isOngoing = cycle.status === 'ONGOING' || cycle.status === 'NEEDS_CONFIRMATION'
      || (insights?.periodOngoing && insights.lastRecordedStartDate?.slice(0, 10) === start);
    const end = getRecordedPeriodEnd(cycle, insights);
    if (isWithinIso(dateIso, start, end)) {
      if (!cycle.endDate && !isOngoing && dateIso > todayIso) {
        return 'predicted';
      }
      return 'recorded';
    }
  }

  const predictedStart = insights?.predictedStartEarliest
    ?? insights?.estimatedPeriodStartDate
    ?? insights?.estimatedNextStartDate;
  const predictedEnd = insights?.predictedStartLatest
    ? addDays(insights.predictedStartLatest, Math.max(1, Math.round(insights.averagePeriodLength ?? 5)) - 1)
    : insights?.estimatedPeriodEndDate ?? insights?.estimatedNextEndDate;

  const ovulationDate = insights?.estimatedOvulationDate?.slice(0, 10);
  if (ovulationDate && dateIso === ovulationDate) return 'ovulation';

  if (isWithinIso(dateIso, insights?.fertileWindowStartDate, insights?.fertileWindowEndDate)) return 'fertile';

  if (isWithinIso(dateIso, predictedStart, predictedEnd)) {
    const kind = insights?.periodStatus === 'DELAYED' ? 'delayed' : 'predicted';
    if (isCloseToRecorded(dateIso, cycles, insights)) {
      return null;
    }
    return kind;
  }
  return null;
}

export function getCalendarRange(anchor: Date, weeks = 3) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: weeks * 7 }, (_, index) => (
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  ));
}

export function getCalendarAnchor(insights?: CycleInsights | null, cycles: CycleRecord[] = []) {
  const today = new Date();
  if (insights?.periodStatus === 'CONFIRMED' || insights?.periodStatus === 'NEEDS_CONFIRMATION') {
    const confirmedAnchor = fromIsoDate(insights.lastRecordedStartDate ?? cycles[0]?.startDate);
    if (confirmedAnchor) return confirmedAnchor;
  }

  const predicted = fromIsoDate(insights?.estimatedPeriodStartDate ?? insights?.estimatedNextStartDate);
  if (!predicted) return today;
  const diff = Math.abs(
    Date.UTC(predicted.getFullYear(), predicted.getMonth(), predicted.getDate())
    - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  return diff <= 21 * 86_400_000 ? today : predicted;
}

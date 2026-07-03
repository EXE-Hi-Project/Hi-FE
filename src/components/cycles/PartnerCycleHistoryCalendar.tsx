import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import api from '../../lib/api';
import type { CycleRecord } from '../../types/shared';
import { toIsoDate } from '../../utils/cycleCalendar';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function monthRange(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { from: toIsoDate(first), to: toIsoDate(last) };
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

export default function PartnerCycleHistoryCalendar() {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<CycleRecord | null>(null);
  const range = useMemo(() => monthRange(month), [month]);
  const days = useMemo(() => calendarDays(month), [month]);
  const historyQuery = useQuery<CycleRecord[]>({
    queryKey: ['partner-cycle-history-month', range.from, range.to],
    queryFn: () => api.get('/users/partner-cycles/history', { params: range }).then(({ data }) => data.items ?? []),
    staleTime: 5 * 60_000,
  });
  const cycles = historyQuery.data ?? [];

  const cycleForDate = (date: Date) => {
    const iso = toIsoDate(date);
    return cycles.find((cycle) => iso >= cycle.startDate.slice(0, 10) && iso <= (cycle.endDate || cycle.startDate).slice(0, 10));
  };

  const moveMonth = (amount: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    setSelected(null);
  };

  return (
    <section className="mt-6 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold text-blue-600">Lịch sử chu kỳ của Người ấy</p>
          <h2 className="mt-1 text-xl font-black capitalize text-slate-900">{month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Tháng trước" className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><CaretLeft size={18} /></button>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Tháng sau" className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><CaretRight size={18} /></button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAYS.map((day) => <div key={day} className="py-1 text-center text-[10px] font-bold text-slate-400">{day}</div>)}
        {days.map((date) => {
          const record = cycleForDate(date);
          const inMonth = date.getMonth() === month.getMonth();
          return (
            <button
              key={toIsoDate(date)}
              type="button"
              onClick={() => record && setSelected(record)}
              disabled={!record}
              className={`min-h-10 rounded-lg text-xs font-extrabold sm:min-h-12 sm:rounded-xl ${record ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-200' : inMonth ? 'bg-slate-50 text-slate-600' : 'text-slate-300'}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {historyQuery.isLoading ? <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-100" /> : null}
      {selected ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-3">
          <div><p className="text-sm font-extrabold text-slate-900">{new Date(`${selected.startDate.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN')} - {new Date(`${(selected.endDate || selected.startDate).slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN')}</p><p className="mt-0.5 text-xs font-semibold text-slate-500">Kỳ đã được xác nhận</p></div>
          <div className="flex gap-2 text-xs font-bold text-blue-700"><span>{selected.periodLength ?? 5} ngày kinh</span><span>·</span><span>{selected.cycleLength ?? 28} ngày chu kỳ</span></div>
        </div>
      ) : null}
    </section>
  );
}

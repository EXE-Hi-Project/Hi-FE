import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { CycleInsights, CycleRecord } from '../../types/shared';
import api from '../../lib/api';
import ResponsiveModal from '../ui/ResponsiveModal';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface CycleHistoryDrawerProps {
  open: boolean;
  cycles: CycleRecord[];
  insights?: CycleInsights;
  editingRecord?: CycleRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromIsoDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatRange(range: DateRange) {
  const format = (value: string) => fromIsoDate(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (!range.endDate) {
    return `${format(range.startDate)} - Chưa kết thúc`;
  }
  return `${format(range.startDate)} - ${format(range.endDate)}`;
}

function includesDate(range: DateRange, date: string) {
  if (!range.endDate) {
    return date === range.startDate;
  }
  return date >= range.startDate && date <= range.endDate;
}

function rangesOverlap(left: DateRange, right: DateRange) {
  const today = toIsoDate(new Date());
  const leftEnd = left.endDate || today;
  const rightEnd = right.endDate || today;
  return left.startDate <= rightEnd && right.startDate <= leftEnd;
}

function rangeLength(range: DateRange) {
  const end = range.endDate || toIsoDate(new Date());
  return Math.max(
    1,
    Math.round((fromIsoDate(end).getTime() - fromIsoDate(range.startDate).getTime()) / 86_400_000) + 1,
  );
}

function getMonthGrid(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const leadingBlankCount = firstDay === 0 ? 6 : firstDay - 1;
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<string | null> = Array(leadingBlankCount).fill(null);
  for (let day = 1; day <= dayCount; day += 1) {
    cells.push(toIsoDate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function recordToRange(record: CycleRecord): DateRange {
  return {
    startDate: record.startDate.slice(0, 10),
    endDate: record.endDate?.slice(0, 10) ?? '',
  };
}

export default function CycleHistoryDrawer({
  open,
  cycles,
  insights,
  editingRecord,
  onClose,
  onSaved,
}: CycleHistoryDrawerProps) {
  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);
  const predictedRange = insights?.estimatedPeriodStartDate && insights?.estimatedPeriodEndDate
    ? { startDate: insights.estimatedPeriodStartDate.slice(0, 10), endDate: insights.estimatedPeriodEndDate.slice(0, 10) }
    : null;
  const predictedMonth = predictedRange ? startOfMonth(fromIsoDate(predictedRange.endDate)) : startOfMonth(today);
  const maxMonth = predictedMonth > startOfMonth(today) ? predictedMonth : startOfMonth(today);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [pendingRanges, setPendingRanges] = useState<DateRange[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setPendingRanges([]);
    if (editingRecord) {
      const range = recordToRange(editingRecord);
      setDraftStart(range.startDate);
      setDraftEnd(range.endDate);
      setVisibleMonth(startOfMonth(fromIsoDate(range.startDate)));
    } else {
      setDraftStart('');
      setDraftEnd('');
      setVisibleMonth(startOfMonth(today));
    }
  }, [editingRecord, open, today]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const calendarGrid = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const storedRanges = useMemo(() => cycles.map(recordToRange), [cycles]);
  const comparableStoredRanges = useMemo(
    () => cycles.filter((record) => record._id !== editingRecord?._id).map(recordToRange),
    [cycles, editingRecord?._id],
  );

  const isOngoing = useMemo(() => {
    return editingRecord?.status === 'ONGOING' || editingRecord?.status === 'NEEDS_CONFIRMATION'
      || (!!editingRecord && !editingRecord.endDate && editingRecord._id === cycles[0]?._id);
  }, [editingRecord, cycles]);

  const predictedPeriodLength = useMemo(() => {
    return Math.round(insights?.averagePeriodLength || editingRecord?.periodLength || 5);
  }, [insights, editingRecord]);

  const predictedEndDate = useMemo(() => {
    if (!draftStart) return '';
    return toIsoDate(new Date(fromIsoDate(draftStart).getTime() + (predictedPeriodLength - 1) * 86_400_000));
  }, [draftStart, predictedPeriodLength]);
  const historyCount = cycles.length + pendingRanges.length;
  const hasRecommendedHistory = historyCount >= 3;

  const validateRange = (range: DateRange) => {
    if (range.endDate && range.endDate > todayIso) return 'Không thể chọn ngày tương lai.';
    if ([...comparableStoredRanges, ...pendingRanges].some((item) => rangesOverlap(item, range))) {
      return 'Khoảng ngày này đang trùng với một kỳ đã ghi nhận.';
    }
    return '';
  };

  const chooseDate = (date: string) => {
    if (date > todayIso) return;
    setError('');
    if (!draftStart || draftEnd) {
      setDraftStart(date);
      setDraftEnd('');
      return;
    }

    const range = date < draftStart
      ? { startDate: date, endDate: draftStart }
      : { startDate: draftStart, endDate: date };
    const validationError = validateRange(range);
    if (validationError) {
      setError(validationError);
      return;
    }

    setDraftStart(range.startDate);
    setDraftEnd(range.endDate);
    if (!editingRecord) {
      setPendingRanges((current) => [...current, range]);
      setDraftStart('');
      setDraftEnd('');
    }
  };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      if (editingRecord) {
        if (!draftStart) throw new Error('Hãy chọn ngày bắt đầu.');
        if (!isOngoing && !draftEnd) throw new Error('Hãy chọn đủ ngày bắt đầu và ngày kết thúc.');
        const range: any = { startDate: draftStart };
        if (draftEnd) {
          range.endDate = draftEnd;
          range.status = 'COMPLETED';
          const validationError = validateRange({ startDate: draftStart, endDate: draftEnd });
          if (validationError) throw new Error(validationError);
        } else {
          range.endDate = null;
          range.status = 'ONGOING';
        }
        await api.put(`/cycle-records/${editingRecord._id}`, range);
      } else {
        if (pendingRanges.length === 0) throw new Error('Hãy chọn ít nhất một kỳ kinh đã diễn ra.');
        const failed: DateRange[] = [];
        for (const range of pendingRanges) {
          try {
            await api.post('/cycle-records', range);
          } catch {
            failed.push(range);
          }
        }
        if (failed.length > 0) {
          setPendingRanges(failed);
          throw new Error(`${failed.length} kỳ chưa lưu được. Hãy kiểm tra các khoảng ngày được đánh dấu.`);
        }
      }
      toast.success(editingRecord ? 'Đã cập nhật kỳ gần nhất' : 'Đã thêm lịch sử chu kỳ');
      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu lịch sử chu kỳ.');
    } finally {
      setSaving(false);
    }
  };

  const selectedRange = draftStart
    ? { startDate: draftStart, endDate: draftEnd || draftStart }
    : null;

  const footer = (
    <div className="grid grid-cols-2 gap-3">
      <button onClick={onClose} className="hi-btn-secondary rounded-xl px-4 py-3 text-sm font-bold">Hủy</button>
      <button onClick={save} disabled={saving || (editingRecord ? !draftStart || (!isOngoing && !draftEnd) : pendingRanges.length === 0)} className="hi-btn-primary rounded-xl px-4 py-3 text-sm font-bold">
        {saving ? 'Đang lưu...' : editingRecord ? 'Lưu thay đổi' : 'Lưu lịch sử'}
      </button>
    </div>
  );

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={editingRecord ? 'Sửa kỳ gần nhất' : 'Thêm lịch sử chu kỳ'}
      description="Chỉ chọn những ngày kinh đã thực sự diễn ra."
      icon="calendar_month"
      maxWidthClassName="sm:max-w-4xl"
      bodyClassName="bg-slate-50/70"
      footer={footer}
    >
        <div className="px-5 py-5 sm:px-6">
          {!editingRecord && (
            <section className="mb-5 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-slate-800">Tăng độ chính xác dự đoán</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Thêm ít nhất 3 kỳ gần nhất để tăng độ chính xác. Bạn vẫn có thể bổ sung toàn bộ lịch sử cũ.</p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-sm font-black text-rose-500 shadow-sm">
                  {historyCount} kỳ đã nhập
                </span>
              </div>
              <div className="mt-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-[11px] font-semibold text-slate-500">
                {hasRecommendedHistory
                  ? 'Đã đủ dữ liệu cơ bản. Bạn vẫn có thể bổ sung thêm toàn bộ lịch sử cũ để dự đoán tốt hơn.'
                  : `Nên có ít nhất 3 kỳ gần nhất. Còn ${3 - historyCount} kỳ nữa để đủ dữ liệu cơ bản.`}
              </div>
            </section>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,.75fr)]">
          <div>
          <section className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
                className="flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50"
                aria-label="Tháng trước"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <p className="text-sm font-extrabold capitalize text-slate-800">
                {visibleMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </p>
              <button
                onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
                disabled={visibleMonth >= maxMonth}
                className="flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-25"
                aria-label="Tháng sau"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS.map((day) => <span key={day} className="pb-1 text-[10px] font-black uppercase text-slate-400">{day}</span>)}
              {calendarGrid.map((date, index) => {
                if (!date) return <span key={`blank-${index}`} />;
                const isDisabled = date > todayIso;
                const isSelected = !!selectedRange && includesDate(selectedRange, date);
                const isPending = pendingRanges.some((range) => includesDate(range, date));
                const isStored = storedRanges.some((range) => includesDate(range, date));
                const isPredicted = !!predictedRange && includesDate(predictedRange, date);
                const isDraftOngoingPredicted = isOngoing && draftStart && !draftEnd && date > draftStart && date <= predictedEndDate;
                const isToday = date === todayIso;
                return (
                  <button
                    key={date}
                    onClick={() => chooseDate(date)}
                    disabled={isDisabled}
                    className={`relative flex aspect-square h-auto min-h-[34px] sm:h-10 items-center justify-center rounded-lg sm:rounded-xl text-xs font-bold transition-colors
                      ${isSelected || isPending ? 'bg-rose-200 text-rose-800 ring-1 ring-rose-300' : ''}
                      ${!isSelected && !isPending && isStored ? 'bg-rose-500 text-white' : ''}
                      ${!isSelected && !isPending && !isStored && (isPredicted || isDraftOngoingPredicted) ? 'border border-dashed border-rose-400 bg-rose-50 text-rose-500' : ''}
                      ${!isSelected && !isPending && !isStored && !isPredicted && !isDraftOngoingPredicted ? 'text-slate-600 hover:bg-rose-50' : ''}
                      ${isDisabled ? 'cursor-not-allowed opacity-30' : ''}
                      ${isToday ? 'ring-2 ring-slate-800 ring-offset-1' : ''}
                    `}
                  >
                    {Number(date.slice(-2))}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-rose-500" /> Đã ghi nhận</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-rose-200 ring-1 ring-rose-300" /> Đang chọn</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full border border-dashed border-rose-400 bg-rose-50" /> Dự kiến</span>
          </div>
          </div>

          <div className="space-y-4">
          {!editingRecord && pendingRanges.length === 0 && (
            <section className="rounded-2xl border border-dashed border-rose-200 bg-white/70 p-4">
              <span className="material-symbols-outlined text-rose-400">touch_app</span>
              <p className="mt-2 text-sm font-extrabold text-slate-700">Chọn khoảng ngày trên lịch</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Nhấn ngày bắt đầu rồi ngày kết thúc. Bạn có thể thêm nhiều kỳ trước khi lưu.</p>
            </section>
          )}
          {pendingRanges.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Các kỳ chuẩn bị lưu</h3>
                <span className="text-xs font-bold text-rose-500">{pendingRanges.length} kỳ</span>
              </div>
              <div className="space-y-2">
                {pendingRanges.map((range) => (
                  <div key={`${range.startDate}-${range.endDate}`} className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/60 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{formatRange(range)}</p>
                      <p className="text-[11px] text-slate-500">{rangeLength(range)} ngày kinh</p>
                    </div>
                    <button onClick={() => setPendingRanges((items) => items.filter((item) => item !== range))} className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-rose-500" aria-label="Xóa kỳ đang chọn">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {editingRecord && draftStart && (
            <section className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-rose-500">Khoảng ngày đang sửa</p>
              <p className="mt-1 text-sm font-extrabold text-slate-800">
                {isOngoing && !draftEnd
                  ? `${fromIsoDate(draftStart).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} - Chưa kết thúc (Dự kiến: ${predictedPeriodLength} ngày)`
                  : formatRange({ startDate: draftStart, endDate: draftEnd })
                }
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isOngoing
                  ? 'Chọn ngày đầu tiên để đặt ngày bắt đầu. Chọn tiếp ngày thứ hai nếu muốn xác định ngày kết thúc.'
                  : 'Chọn lại ngày đầu tiên rồi ngày kết thúc nếu cần thay đổi.'
                }
              </p>
            </section>
          )}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold leading-relaxed text-red-600">{error}</p>}
          </div>
          </div>
        </div>
    </ResponsiveModal>
  );
}

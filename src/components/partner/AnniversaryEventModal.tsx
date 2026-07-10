import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash, X } from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import { getUserFacingError } from '../../lib/userFacingError';
import type {
  CoupleAnniversaryColor,
  CoupleAnniversaryEffect,
  CoupleAnniversaryEvent,
} from '../../types/shared';
import { ICONS } from '../../utils/coupleAnniversaryCalendar';
import Button from '../ui/Button';
import {
  ANNIVERSARY_STICKER_LABELS,
  ANNIVERSARY_STICKERS,
  ANNIVERSARY_SYMBOL_LABELS,
} from './AnniversaryVisualData';
import { AnniversarySticker, AnniversarySymbol } from './AnniversaryVisuals';

interface AnniversaryEventModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  existingEvent?: CoupleAnniversaryEvent | null;
  variant?: 'female' | 'male';
}

interface AnniversaryPayload {
  eventDate: string;
  title: string;
  note: string;
  color: CoupleAnniversaryColor;
  effect: CoupleAnniversaryEffect;
  icon: string;
  sticker: string;
}

const COLORS: CoupleAnniversaryColor[] = ['pink', 'rose', 'violet', 'sky', 'emerald', 'amber'];
const EFFECTS: CoupleAnniversaryEffect[] = ['none', 'sparkle', 'float', 'glow', 'confetti'];

const COLOR_LABELS: Record<CoupleAnniversaryColor, string> = {
  pink: 'Hồng ngọt ngào',
  rose: 'Đỏ nồng nàn',
  violet: 'Tím lãng mạn',
  sky: 'Xanh thanh bình',
  emerald: 'Xanh ngọc bích',
  amber: 'Vàng ấm áp',
};

const COLOR_SWATCH_CLASS: Record<CoupleAnniversaryColor, string> = {
  pink: 'bg-pink-400',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  sky: 'bg-sky-400',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
};

const EFFECT_LABELS: Record<CoupleAnniversaryEffect, string> = {
  none: 'Tĩnh',
  sparkle: 'Lấp lánh',
  float: 'Bay nhẹ',
  glow: 'Tỏa sáng',
  confetti: 'Pháo hoa',
};

export default function AnniversaryEventModal({
  open,
  onClose,
  date,
  existingEvent,
  variant = 'female',
}: AnniversaryEventModalProps) {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isMale = variant === 'male';
  const accentBorder = isMale
    ? 'focus:border-blue-400 focus:ring-blue-100'
    : 'focus:border-pink-400 focus:ring-pink-100';
  const [eventDateVal, setEventDateVal] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [eventColor, setEventColor] = useState<CoupleAnniversaryColor>('pink');
  const [eventEffect, setEventEffect] = useState<CoupleAnniversaryEffect>('none');
  const [eventIcon, setEventIcon] = useState('favorite');
  const [eventSticker, setEventSticker] = useState('heart');
  const isStartDate = existingEvent?.type === 'START_DATE';

  useEffect(() => {
    if (!open) return;
    if (existingEvent) {
      setEventDateVal(existingEvent.eventDate.slice(0, 10));
      setEventTitle(existingEvent.title || 'Ngày bên nhau');
      setEventNote(existingEvent.note ?? '');
      setEventColor(existingEvent.color);
      setEventEffect(existingEvent.effect);
      setEventIcon(existingEvent.icon);
      setEventSticker(existingEvent.sticker);
    } else {
      setEventDateVal(date);
      setEventTitle('');
      setEventNote('');
      setEventColor('pink');
      setEventEffect('none');
      setEventIcon('favorite');
      setEventSticker('heart');
    }
  }, [date, existingEvent, open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  const saveMutation = useMutation({
    mutationFn: (payload: AnniversaryPayload) => {
      if (existingEvent?.type === 'START_DATE') {
        return api.put('/partner/anniversaries/start-date', {
          startDate: payload.eventDate,
          title: payload.title,
          note: payload.note,
          color: payload.color,
          effect: payload.effect,
          icon: payload.icon,
          sticker: payload.sticker,
        });
      }
      if (existingEvent) {
        return api.put(`/partner/anniversaries/events/${existingEvent._id}`, payload);
      }
      return api.post('/partner/anniversaries/events', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-anniversaries'] });
      toast.success(existingEvent ? 'Đã lưu thay đổi' : 'Đã thêm kỷ niệm mới');
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(getUserFacingError(error, 'Không thể lưu kỷ niệm'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/partner/anniversaries/events/${existingEvent?._id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-anniversaries'] });
      toast.success('Đã xóa kỷ niệm');
      onClose();
    },
    onError: () => toast.error('Không thể xóa kỷ niệm'),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-sm animate-fade-in sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="anniversary-modal-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <h2 id="anniversary-modal-title" className="text-lg font-black text-slate-900">
            {isStartDate
              ? 'Thiết lập Ngày bên nhau'
              : existingEvent
                ? 'Chỉnh sửa ngày kỷ niệm'
                : 'Thêm ngày kỷ niệm'}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <form
          className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_18rem]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!eventDateVal || (!isStartDate && !eventTitle.trim())) {
              toast.error('Vui lòng điền đủ ngày và tiêu đề');
              return;
            }
            saveMutation.mutate({
              eventDate: eventDateVal,
              title: eventTitle.trim() || 'Ngày bên nhau',
              note: eventNote.trim(),
              color: eventColor,
              effect: eventEffect,
              icon: eventIcon,
              sticker: eventSticker,
            });
          }}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="anniversary-date" className="text-xs font-bold text-slate-600">Ngày kỷ niệm</label>
              <input
                id="anniversary-date"
                type="date"
                value={eventDateVal}
                onChange={(event) => setEventDateVal(event.target.value)}
                className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-4 ${accentBorder}`}
                max={isStartDate ? new Date().toISOString().slice(0, 10) : undefined}
                required
              />
            </div>

            <div>
              <label htmlFor="anniversary-title" className="text-xs font-bold text-slate-600">
                {isStartDate ? 'Tên hiển thị' : 'Tiêu đề kỷ niệm'}
              </label>
              <input
                id="anniversary-title"
                type="text"
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder={isStartDate ? 'Ngày bên nhau' : 'Ví dụ: Chuyến đi đầu tiên'}
                className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-4 ${accentBorder}`}
                maxLength={120}
                required={!isStartDate}
              />
            </div>

            <div>
              <label htmlFor="anniversary-note" className="text-xs font-bold text-slate-600">Ghi chú</label>
              <textarea
                id="anniversary-note"
                value={eventNote}
                onChange={(event) => setEventNote(event.target.value)}
                placeholder="Lưu lại điều hai bạn muốn nhớ..."
                rows={5}
                className={`mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-4 ${accentBorder}`}
                maxLength={1000}
              />
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <span className="grid size-11 place-items-center rounded-xl bg-slate-50">
                <AnniversarySticker name={eventSticker} size={28} />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-500">Xem trước</p>
                <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <AnniversarySymbol name={eventIcon} size={17} />
                  {eventTitle.trim() || 'Ngày kỷ niệm'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 border-t border-slate-100 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <fieldset>
              <legend className="text-xs font-bold text-slate-600">Màu sắc</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEventColor(color)}
                    className={`grid size-9 place-items-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 ${
                      eventColor === color ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                    aria-label={COLOR_LABELS[color]}
                    aria-pressed={eventColor === color}
                    title={COLOR_LABELS[color]}
                  >
                    <span className={`size-4 rounded-full ${COLOR_SWATCH_CLASS[color]}`} />
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-bold text-slate-600">Hiệu ứng</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {EFFECTS.map((effect) => (
                  <button
                    key={effect}
                    type="button"
                    onClick={() => setEventEffect(effect)}
                    className={`min-h-9 rounded-lg border px-2 text-xs font-bold transition ${
                      eventEffect === effect
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                    aria-pressed={eventEffect === effect}
                  >
                    {EFFECT_LABELS[effect]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-bold text-slate-600">Icon biểu tượng</legend>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEventIcon(icon)}
                    className={`grid aspect-square place-items-center rounded-lg border transition ${
                      eventIcon === icon
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-pink-200 hover:text-pink-600'
                    }`}
                    aria-label={ANNIVERSARY_SYMBOL_LABELS[icon] || icon}
                    aria-pressed={eventIcon === icon}
                    title={ANNIVERSARY_SYMBOL_LABELS[icon] || icon}
                  >
                    <AnniversarySymbol name={icon} size={18} />
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-bold text-slate-600">Sticker hình dán</legend>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {ANNIVERSARY_STICKERS.map((sticker) => (
                  <button
                    key={sticker}
                    type="button"
                    onClick={() => setEventSticker(sticker)}
                    className={`grid aspect-square place-items-center rounded-lg border bg-white transition ${
                      eventSticker === sticker ? 'border-pink-400 ring-2 ring-pink-100' : 'border-slate-200 hover:border-pink-200'
                    }`}
                    aria-label={ANNIVERSARY_STICKER_LABELS[sticker] || sticker}
                    aria-pressed={eventSticker === sticker}
                    title={ANNIVERSARY_STICKER_LABELS[sticker] || sticker}
                  >
                    <AnniversarySticker name={sticker} size={23} />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
            <div>
              {existingEvent && !isStartDate && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Bạn chắc chắn muốn xóa kỷ niệm này chứ?')) deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash size={17} />
                  Xóa
                </button>
              )}
            </div>
            <div className="flex gap-2 sm:justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
              <Button type="submit" loading={saveMutation.isPending}>
                {existingEvent ? 'Lưu thay đổi' : 'Thêm kỷ niệm'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

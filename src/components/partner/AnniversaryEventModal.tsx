import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { X, Trash } from '@phosphor-icons/react';
import api from '../../lib/api';
import type {
  CoupleAnniversaryEvent,
  CoupleAnniversaryColor,
  CoupleAnniversaryEffect,
} from '../../types/shared';
import Button from '../ui/Button';
import {
  ANNIVERSARY_STICKERS,
  ANNIVERSARY_STICKER_LABELS,
  ANNIVERSARY_SYMBOL_LABELS,
} from './AnniversaryVisualData';
import { AnniversarySticker, AnniversarySymbol } from './AnniversaryVisuals';

interface AnniversaryEventModalProps {
  open: boolean;
  onClose: () => void;
  date: string; // ISO date string (YYYY-MM-DD)
  existingEvent?: CoupleAnniversaryEvent | null;
  variant?: 'female' | 'male';
}

const COLOR_LABELS: Record<CoupleAnniversaryColor, string> = {
  pink: 'Hồng ngọt ngào',
  rose: 'Đỏ nồng nàn',
  violet: 'Tím lãng mạn',
  sky: 'Xanh thanh bình',
  emerald: 'Xanh ngọc bích',
  amber: 'Vàng ấm áp',
};

const EFFECT_LABELS: Record<CoupleAnniversaryEffect, string> = {
  none: 'Không hiệu ứng',
  sparkle: 'Lấp lánh',
  float: 'Bay bổng',
  glow: 'Tỏa sáng',
  confetti: 'Pháo hoa',
};

import {
  ICONS,
} from '../../utils/coupleAnniversaryCalendar';

const COLORS: CoupleAnniversaryColor[] = ['pink', 'rose', 'violet', 'sky', 'emerald', 'amber'];
const EFFECTS: CoupleAnniversaryEffect[] = ['none', 'sparkle', 'float', 'glow', 'confetti'];
const STICKERS = ANNIVERSARY_STICKERS;

export default function AnniversaryEventModal({
  open,
  onClose,
  date,
  existingEvent,
  variant = 'female',
}: AnniversaryEventModalProps) {
  const isMale = variant === 'male';
  const queryClient = useClient();
  const accentBorder = isMale ? 'focus:border-blue-400 focus:ring-blue-100' : 'focus:border-pink-400 focus:ring-pink-100';

  const [eventDateVal, setEventDateVal] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [eventColor, setEventColor] = useState<CoupleAnniversaryColor>('pink');
  const [eventEffect, setEventEffect] = useState<CoupleAnniversaryEffect>('none');
  const [eventIcon, setEventIcon] = useState('favorite');
  const [eventSticker, setEventSticker] = useState('heart');

  function useClient() {
    return useQueryClient();
  }

  useEffect(() => {
    if (open) {
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
    }
  }, [open, date, existingEvent]);

  const saveMutation = useMutation({
    mutationFn: (payload: {
      eventDate: string;
      title: string;
      note: string;
      color: string;
      effect: string;
      icon: string;
      sticker: string;
    }) => {
      if (existingEvent) {
        if (existingEvent.type === 'START_DATE') {
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
        return api.put(`/partner/anniversaries/events/${existingEvent._id}`, payload);
      }
      return api.post('/partner/anniversaries/events', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-anniversaries'] });
      toast.success(existingEvent ? 'Đã lưu thay đổi' : 'Đã thêm kỷ niệm mới');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể lưu kỷ niệm');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!existingEvent) {
        throw new Error('No event to delete');
      }
      return api.delete(`/partner/anniversaries/events/${existingEvent._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-anniversaries'] });
      toast.success('Đã xóa kỷ niệm');
      onClose();
    },
    onError: () => {
      toast.error('Không thể xóa kỷ niệm');
    },
  });

  if (!open) return null;

  const isStartDate = existingEvent?.type === 'START_DATE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-black text-slate-900">
            {isStartDate
              ? 'Thiết lập Ngày bên nhau'
              : existingEvent
              ? 'Chỉnh sửa ngày kỷ niệm'
              : 'Thêm ngày kỷ niệm'}
          </h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!eventDateVal || (!isStartDate && !eventTitle.trim())) {
              toast.error('Vui lòng điền đủ ngày và tiêu đề');
              return;
            }
            saveMutation.mutate({
              eventDate: eventDateVal,
              title: isStartDate ? 'Ngày bên nhau' : eventTitle.trim(),
              note: eventNote.trim(),
              color: eventColor,
              effect: eventEffect,
              icon: eventIcon,
              sticker: eventSticker,
            });
          }}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày kỷ niệm</label>
            <input
              type="date"
              value={eventDateVal}
              onChange={(e) => setEventDateVal(e.target.value)}
              className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 ${accentBorder}`}
              max={isStartDate ? new Date().toISOString().slice(0, 10) : undefined}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isStartDate ? 'Tiêu đề hiển thị' : 'Tiêu đề kỷ niệm'}
            </label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder={isStartDate ? "Ví dụ: Ngày bên nhau, Ngày bắt đầu..." : "Ví dụ: Kỷ niệm chuyến đi chơi xa đầu tiên"}
              className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-4 ${accentBorder}`}
              maxLength={120}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú thêm</label>
            <textarea
              value={eventNote}
              onChange={(e) => setEventNote(e.target.value)}
              placeholder="Lưu lại những cảm xúc đặc biệt..."
              rows={3}
              className={`mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-4 ${accentBorder}`}
              maxLength={1000}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Màu sắc hiển thị</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEventColor(c)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-bold transition hover:bg-slate-50 ${
                    eventColor === c
                      ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full bg-${c}-500 inline-block`} style={{ backgroundColor: c === 'pink' ? '#f472b6' : c === 'rose' ? '#f43f5e' : c === 'violet' ? '#8b5cf6' : c === 'sky' ? '#38bdf8' : c === 'emerald' ? '#10b981' : '#f59e0b' }} />
                  {COLOR_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hiệu ứng động</label>
            <select
              value={eventEffect}
              onChange={(e) => setEventEffect(e.target.value as CoupleAnniversaryEffect)}
              className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-4 ${accentBorder}`}
            >
              {EFFECTS.map((ef) => (
                <option key={ef} value={ef}>
                  {EFFECT_LABELS[ef]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Icon biểu tượng</label>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setEventIcon(icon)}
                  className={`grid aspect-square place-items-center rounded-xl border transition active:scale-95 ${
                    eventIcon === icon
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600'
                  }`}
                  title={ANNIVERSARY_SYMBOL_LABELS[icon] || icon}
                  aria-label={ANNIVERSARY_SYMBOL_LABELS[icon] || icon}
                >
                  <AnniversarySymbol name={icon} size={19} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Sticker hình dán</label>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker}
                  type="button"
                  onClick={() => setEventSticker(sticker)}
                  className={`grid aspect-square place-items-center rounded-xl border bg-white transition active:scale-95 ${
                    eventSticker === sticker
                      ? 'border-pink-400 ring-2 ring-pink-100'
                      : 'border-slate-200 hover:border-pink-200 hover:bg-pink-50'
                  }`}
                  title={ANNIVERSARY_STICKER_LABELS[sticker] || sticker}
                  aria-label={ANNIVERSARY_STICKER_LABELS[sticker] || sticker}
                >
                  <AnniversarySticker name={sticker} size={25} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <Button
              type="submit"
              loading={saveMutation.isPending}
              className="flex-grow"
            >
              {existingEvent ? 'Lưu thay đổi' : 'Thêm kỷ niệm'}
            </Button>
            {existingEvent && !isStartDate && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn chắc chắn muốn xóa kỷ niệm này chứ?')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="flex size-11 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                title="Xóa kỷ niệm"
              >
                <Trash size={18} />
              </button>
            )}
            <Button type="button" variant="secondary" onClick={onClose}>
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

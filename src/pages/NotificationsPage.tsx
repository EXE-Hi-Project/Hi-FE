import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import api from '../lib/api';
import { Notification } from '../types';

const notificationMeta: Record<string, { icon: string; label: string; tone: string; bg: string }> = {
  SUPPORT_REPLY: { icon: 'support_agent', label: 'Hỗ trợ', tone: 'text-rose-700', bg: 'bg-rose-50' },
  SUPPORT_CLOSED: { icon: 'task_alt', label: 'Hỗ trợ', tone: 'text-emerald-700', bg: 'bg-emerald-50' },
  PARTNER_CONNECT: { icon: 'favorite', label: 'Kết nối', tone: 'text-pink-500', bg: 'bg-pink-50' },
  PARTNER_DISCONNECT: { icon: 'heart_broken', label: 'Hủy kết nối', tone: 'text-rose-500', bg: 'bg-rose-50' },
  PARTNER_MOOD_UPDATE: { icon: 'sentiment_satisfied', label: 'Cảm xúc từ Người ấy', tone: 'text-amber-500', bg: 'bg-amber-50' },
  PERIOD_REMINDER: { icon: 'water_drop', label: 'Nhắc kỳ kinh', tone: 'text-pink-500', bg: 'bg-pink-50' },
  PERIOD_UPCOMING: { icon: 'event_upcoming', label: 'Sắp tới kỳ', tone: 'text-pink-500', bg: 'bg-pink-50' },
  PARTNER_PERIOD_REMINDER: { icon: 'volunteer_activism', label: 'Người ấy sắp tới kỳ', tone: 'text-blue-500', bg: 'bg-blue-50' },
  PARTNER_PERIOD_UPCOMING: { icon: 'volunteer_activism', label: 'Người ấy sắp tới kỳ', tone: 'text-blue-500', bg: 'bg-blue-50' },
  DAILY_CHECK_IN: { icon: 'notifications_active', label: 'Hỏi thăm hôm nay', tone: 'text-violet-500', bg: 'bg-violet-50' },
  COUPLE_DAILY_QUESTION: { icon: 'forum', label: 'Câu hỏi của chúng mình', tone: 'text-pink-500', bg: 'bg-pink-50' },
  PARTNER_ANSWERED_DAILY_QUESTION: { icon: 'mark_chat_read', label: 'Người ấy đã trả lời', tone: 'text-amber-600', bg: 'bg-amber-50' },
  COUPLE_QUESTION_UNLOCKED: { icon: 'lock_open', label: 'Đã mở câu trả lời', tone: 'text-emerald-600', bg: 'bg-emerald-50' },
  CONTEXTUAL_CARE_SUGGESTION: { icon: 'volunteer_activism', label: 'Gợi ý quan tâm', tone: 'text-violet-600', bg: 'bg-violet-50' },
  period_coming: { icon: 'event_upcoming', label: 'Sắp đến kỳ', tone: 'text-pink-500', bg: 'bg-pink-50' },
  period_started: { icon: 'water_drop', label: 'Bắt đầu kỳ', tone: 'text-pink-500', bg: 'bg-pink-50' },
  reminder: { icon: 'alarm', label: 'Nhắc nhở', tone: 'text-violet-500', bg: 'bg-violet-50' },
  partner: { icon: 'favorite', label: 'Người ấy', tone: 'text-blue-500', bg: 'bg-blue-50' },
};

function isToday(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NotificationRow({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLongMessage = notification.message.length > 240;
  const meta = notificationMeta[notification.type] ?? {
    icon: 'notifications',
    label: notification.type,
    tone: 'text-slate-500',
    bg: 'bg-slate-50',
  };
  return (
    <div
      onClick={() => !notification.read && onRead(notification._id)}
      className={[
        'group relative overflow-hidden rounded-3xl border p-4 transition-all duration-200',
        notification.read
          ? 'border-white/80 bg-white/75 hover:bg-white'
          : 'border-pink-100 bg-white shadow-sm shadow-pink-100/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-100/70',
      ].join(' ')}
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-pink-100/60 to-sky-100/40 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${meta.bg} ${meta.tone}`}>
          <span className="material-symbols-outlined text-[22px]">{meta.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-sm font-extrabold ${notification.read ? 'text-slate-700' : 'text-slate-950'}`}>
                {notification.title}
              </p>
              <p className={`mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-500 ${!expanded && isLongMessage ? 'line-clamp-3' : ''}`}>
                {notification.message}
              </p>
              {isLongMessage && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpanded((value) => !value);
                  }}
                  className="mt-2 text-xs font-bold text-violet-600 hover:text-violet-700"
                >
                  {expanded ? 'Thu gọn' : 'Xem thêm'}
                </button>
              )}
            </div>
            {!notification.read && <span className="mt-1 size-2.5 shrink-0 rounded-full bg-pink-500 shadow-sm shadow-pink-300" />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${meta.bg} ${meta.tone}`}>
              {meta.label}
            </span>
            <span className="text-xs font-semibold text-slate-400">{formatTime(notification.createdAt)}</span>
            {notification.actionUrl && (
              <Link
                to={notification.actionUrl}
                onClick={(event) => event.stopPropagation()}
                className="text-xs font-bold text-blue-500 transition-colors hover:text-blue-600"
              >
                Mở chi tiết
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data: notifications = [], isLoading, isError } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.notifications),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  const { mutate: markAll, isPending: markingAll } = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      invalidate();
      toast.success('Đã đánh dấu tất cả là đã đọc');
    },
  });

  const { mutate: markOne } = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const todayNotifications = notifications.filter((n) => isToday(n.createdAt));
  const olderNotifications = notifications.filter((n) => !isToday(n.createdAt));

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-pink-200/50 blur-3xl" />
        <div className="absolute -bottom-20 left-20 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-500">
              <span className="material-symbols-outlined text-[16px]">notifications_active</span>
              Trung tâm thông báo
            </p>
            <h1 className="hi-page-title text-3xl">Thông báo của bạn</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả thông báo đã được đọc'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={() => markAll()} loading={markingAll}>
              Đánh dấu tất cả
            </Button>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl border border-white/80 bg-white/80 py-12 shadow-sm">
          <Spinner className="py-8" />
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-rose-100 bg-white/85 p-8 text-center shadow-sm">
          <p className="font-extrabold text-slate-800">Không tải được thông báo</p>
          <p className="mt-1 text-sm text-slate-500">Vui lòng thử lại sau một chút.</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-pink-200 bg-white/80 p-10 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
            <span className="material-symbols-outlined text-[28px]">notifications</span>
          </span>
          <p className="mt-4 font-extrabold text-slate-800">Chưa có thông báo nào</p>
          <p className="mt-1 text-sm text-slate-500">Hi sẽ đặt các nhắc nhở chu kỳ, cảm xúc và Người ấy tại đây.</p>
        </div>
      ) : (
        <div className="space-y-7">
          {todayNotifications.length > 0 && (
            <section className="space-y-3">
              <h2 className="px-1 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Hôm nay</h2>
              {todayNotifications.map((notification) => (
                <NotificationRow key={notification._id} notification={notification} onRead={markOne} />
              ))}
            </section>
          )}

          {olderNotifications.length > 0 && (
            <section className="space-y-3">
              <h2 className="px-1 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Trước đó</h2>
              {olderNotifications.map((notification) => (
                <NotificationRow key={notification._id} notification={notification} onRead={markOne} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

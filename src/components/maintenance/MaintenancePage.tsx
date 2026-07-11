import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClockCountdown, Wrench } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import HiLogo from '../ui/HiLogo';
import MaintenanceVisual from './MaintenanceVisual';

export interface MaintenanceStatus {
  enabled: boolean;
  active: boolean;
  scheduled: boolean;
  mode: 'IMMEDIATE' | 'SCHEDULED';
  title: string;
  message: string;
  startsAt?: string | null;
  endsAt?: string | null;
  updatedAt?: string | null;
}

function formatWindow(startsAt?: string | null, endsAt?: string | null) {
  if (!endsAt) return 'Đang cập nhật thời gian mở lại';
  const formatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
  });
  const start = startsAt ? formatter.format(new Date(startsAt)) : 'Ngay bây giờ';
  return `${start} - ${formatter.format(new Date(endsAt))}`;
}

function useCountdown(endsAt?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return useMemo(() => {
    const remaining = Math.max(0, new Date(endsAt ?? now).getTime() - now);
    const days = Math.floor(remaining / 86_400_000);
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1000);
    return { remaining, days, hours, minutes, seconds };
  }, [endsAt, now]);
}

export default function MaintenancePage({ status }: { status: MaintenanceStatus }) {
  const reduceMotion = useReducedMotion();
  const countdown = useCountdown(status.endsAt);

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#fcfdff] px-4 py-7 text-slate-900 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(186,230,253,0.34),transparent_28%),radial-gradient(circle_at_88%_84%,rgba(251,207,232,0.42),transparent_34%)]" />
      <div className="pointer-events-none absolute -left-28 top-12 h-[36rem] w-[36rem] rounded-full border border-rose-100/70" />
      <div className="pointer-events-none absolute -right-40 bottom-[-16rem] h-[40rem] w-[40rem] rounded-full border border-sky-100/80" />
      <section className="relative w-full max-w-3xl text-center">
        <div className="mx-auto inline-flex items-center gap-3 px-4 py-2">
          <HiLogo size={52} />
          <span className="text-3xl font-extrabold tracking-normal text-slate-900">Hi <span className="text-rose-500">Lover</span></span>
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">Ứng dụng chăm sóc sức khỏe sinh sản và hạnh phúc lứa đôi</p>

        <MaintenanceVisual />

        <motion.div
          className="mx-auto mt-0 max-w-2xl px-4 pb-5 pt-0 sm:px-8"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.45, delay: reduceMotion ? 0 : 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white/85 px-4 py-2 text-sm font-black text-rose-500 shadow-[0_12px_30px_rgba(251,113,133,0.12)] backdrop-blur">
            <Wrench size={15} weight="fill" /> Đang bảo trì
          </div>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-5xl">{status.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500 sm:text-base">{status.message}</p>

          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white/75 px-4 py-3 text-rose-500 shadow-sm backdrop-blur">
            <ClockCountdown size={20} weight="fill" />
            <p className="text-sm font-extrabold sm:text-base">{formatWindow(status.startsAt, status.endsAt)}</p>
          </div>

          <div className="mx-auto mt-4 grid max-w-xl grid-cols-4 gap-2 sm:gap-3" aria-label="Thời gian còn lại">
            {[
              [countdown.days, 'Ngày'],
              [countdown.hours, 'Giờ'],
              [countdown.minutes, 'Phút'],
              [countdown.seconds, 'Giây'],
            ].map(([value, label]) => <div key={String(label)} className="rounded-xl border border-slate-100 bg-white/90 px-2 py-3 shadow-sm"><p className="text-2xl font-extrabold tabular-nums text-rose-500 sm:text-3xl">{String(value).padStart(2, '0')}</p><p className="mt-1 text-[10px] font-bold uppercase text-slate-400 sm:text-[11px]">{label}</p></div>)}
          </div>
        </motion.div>

        <Link to="/login?next=%2Fadmin&maintenance=1" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-600 transition-colors hover:text-sky-700">
          Đăng nhập quản trị <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}

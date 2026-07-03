import { clsx } from 'clsx';

type SubscriptionLike = {
  plan?: string | null;
  status?: string | null;
};

interface PlanStatusPillProps {
  subscription?: SubscriptionLike | null;
  compact?: boolean;
  className?: string;
}

function getPlanMeta(subscription?: SubscriptionLike | null) {
  const plan = (subscription?.plan ?? 'free').toLowerCase();
  const active = subscription?.status === 'active';
  if (active && plan.includes('yearly')) {
    return {
      label: 'HI MAX',
      sublabel: '365 ngày',
      className: 'border border-sky-200 bg-sky-50 text-sky-700 shadow-sm',
    };
  }
  if (active && (plan.includes('monthly') || plan === 'premium')) {
    return {
      label: 'HI PRO',
      sublabel: '30 ngày',
      className: 'border border-rose-200 bg-rose-50 text-rose-700 shadow-sm',
    };
  }
  return {
    label: 'FREE',
    sublabel: 'Cơ bản',
    className: 'border border-sky-100 bg-white/90 text-slate-600 shadow-sm',
  };
}

export default function PlanStatusPill({ subscription, compact = false, className }: PlanStatusPillProps) {
  const meta = getPlanMeta(subscription);
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-black uppercase tracking-wide transition-colors duration-200',
        compact ? 'px-2.5 py-1 text-[10px]' : 'gap-2 px-3.5 py-2 text-[11px]',
        meta.className,
        className,
      )}
    >
      <span>{meta.label}</span>
      {!compact && (
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-extrabold normal-case tracking-normal text-current">
          {meta.sublabel}
        </span>
      )}
    </span>
  );
}

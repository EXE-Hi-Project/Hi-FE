import { Link } from 'react-router-dom';

interface PremiumLockCardProps {
  title: string;
  description: string;
  compact?: boolean;
  accent?: 'pink' | 'blue';
}

export default function PremiumLockCard({
  title,
  description,
  compact = false,
  accent = 'pink',
}: PremiumLockCardProps) {
  const tone = accent === 'blue'
    ? 'border-blue-100 bg-blue-50/70 text-blue-700'
    : 'border-pink-100 bg-pink-50/70 text-pink-700';

  return (
    <div className={`rounded-3xl border ${tone} ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em]">
            <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
            Hi Pro · Hi Max
          </div>
          <h3 className="mt-2 text-lg font-black text-slate-900">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">{description}</p>
        </div>
        <Link
          to="/settings#pricing"
          className="hi-btn-primary inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-black"
        >
          Xem Hi Pro &amp; Hi Max
        </Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, Tag } from '@phosphor-icons/react';
import { formatPlanPrice, usePlanPricing } from '../../hooks/usePlanPricing';

export default function SaleBanner() {
  const { data: pricing } = usePlanPricing();
  const sale = pricing?.activeSale;
  if (!sale || !pricing) return null;

  return (
    <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
          <Tag size={20} weight="fill" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-900">{sale.title}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Hi Pro {formatPlanPrice(pricing.hiPro.currentPrice)} · Hi Max {formatPlanPrice(pricing.hiMax.currentPrice)} · đến {new Date(sale.endsAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>
      <Link to="/settings#pricing" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 text-xs font-extrabold text-white hover:bg-rose-600">
        Xem ưu đãi <ArrowRight size={15} />
      </Link>
    </section>
  );
}

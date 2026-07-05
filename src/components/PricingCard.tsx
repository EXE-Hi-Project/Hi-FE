import { useCancelSubscription, useCheckout, useSubscription } from '../hooks/useSubscription';
import {
  FREE_PLAN_FEATURES,
  PREMIUM_PLAN_FEATURES,
  PREMIUM_YEARLY_FEATURES,
} from '../config/subscriptionPlans';
import Spinner from './ui/Spinner';
import { CalendarBlank, CheckCircle, CrownSimple } from '@phosphor-icons/react';
import { FALLBACK_PRICING, formatPlanPrice, usePlanPricing } from '../hooks/usePlanPricing';

type PaidPlanId = 'monthly' | 'yearly';

interface PricingPlan {
  id: 'free' | PaidPlanId;
  label: string;
  price: string;
  basePrice?: string;
  discountPercent?: number;
  period: string;
  description: string;
  priceId?: PaidPlanId;
  highlight?: boolean;
  badge?: string;
  features: string[];
}

export default function PricingCard() {
  const { data: subscription, isLoading } = useSubscription();
  const { data: pricing = FALLBACK_PRICING } = usePlanPricing();
  const checkout = useCheckout();
  const cancelSub = useCancelSubscription();

  const isPremium = subscription?.tier === 'PREMIUM';
  const isCanceled = subscription?.status === 'canceled';
  const currentPeriodEnd = subscription?.currentPeriodEnd;

  const plans: PricingPlan[] = [
    {
      id: 'free',
      label: 'Đồng Hành Cơ Bản',
      price: '0đ',
      period: '/mãi mãi',
      description: 'Đầy đủ công cụ chăm sóc sức khỏe hằng ngày.',
      features: [...FREE_PLAN_FEATURES],
    },
    {
      id: 'monthly',
      label: 'Hi Pro',
      price: formatPlanPrice(pricing.hiPro.currentPrice),
      basePrice: pricing.hiPro.discountPercent > 0 ? formatPlanPrice(pricing.hiPro.basePrice) : undefined,
      discountPercent: pricing.hiPro.discountPercent,
      badge: pricing.hiPro.discountPercent > 0 ? `Giảm ${pricing.hiPro.discountPercent}%` : undefined,
      period: '/30 ngày',
      description: 'Phân tích sâu hơn và tăng hạn mức Hi AI.',
      priceId: 'monthly',
      features: [...PREMIUM_PLAN_FEATURES],
    },
    {
      id: 'yearly',
      label: 'Hi Max',
      price: formatPlanPrice(pricing.hiMax.currentPrice),
      basePrice: pricing.hiMax.discountPercent > 0 ? formatPlanPrice(pricing.hiMax.basePrice) : undefined,
      discountPercent: pricing.hiMax.discountPercent,
      period: '/365 ngày',
      description: 'Đồng hành trọn năm với mức tiết kiệm tốt hơn.',
      priceId: 'yearly',
      highlight: true,
      badge: pricing.hiMax.discountPercent > 0 ? `Giảm ${pricing.hiMax.discountPercent}%` : 'Tiết kiệm dài hạn',
      features: [...PREMIUM_YEARLY_FEATURES],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner className="h-8 w-8 text-pink-500" />
      </div>
    );
  }

  if (isPremium) {
    const planName = subscription?.plan === 'PREMIUM_YEARLY' ? 'Hi Max' : 'Hi Pro';

    return (
      <section className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-pink-50 text-pink-600">
              <CrownSimple size={22} weight="fill" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">{planName} đang hoạt động</h3>
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle size={13} weight="fill" />
                  Đã kích hoạt
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-500">{planName} đang mở khóa toàn bộ quyền lợi trên tài khoản này.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            {currentPeriodEnd && (
              <div className="flex items-center gap-3 sm:min-w-44">
                <CalendarBlank size={20} className="shrink-0 text-pink-500" />
                <div>
                  <p className="text-[11px] font-bold text-slate-400">Ngày hết hạn</p>
                  <p className="text-sm font-extrabold text-slate-800">
                    {new Date(currentPeriodEnd).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            )}

            {subscription?.cancelAtPeriodEnd ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                Đã dừng gia hạn
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Bạn có chắc chắn muốn dừng gia hạn ${planName}?`)) cancelSub.mutate();
                }}
                disabled={cancelSub.isPending}
                className="h-10 whitespace-nowrap rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.98] disabled:opacity-60"
              >
                {cancelSub.isPending ? 'Đang xử lý...' : 'Dừng gia hạn'}
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div id="pricing" className="mx-auto max-w-5xl px-4 py-8">
      {pricing.activeSale && (
        <div className="mx-auto mb-6 max-w-3xl rounded-3xl border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-sky-50 p-4 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-pink-500">Đang áp dụng ưu đãi</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">{pricing.activeSale.title}</h3>
          {pricing.activeSale.subtitle ? <p className="mt-1 text-sm font-semibold text-slate-500">{pricing.activeSale.subtitle}</p> : null}
          <p className="mt-2 text-xs font-bold text-slate-400">Kết thúc: {new Date(pricing.activeSale.endsAt).toLocaleString('vi-VN')}</p>
        </div>
      )}

      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="hi-page-title text-3xl sm:text-4xl">
          Lựa chọn Gói <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">Đồng Hành</span> cùng Hi
        </h2>
        <p className="mt-4 text-base font-semibold leading-relaxed text-slate-500">
          Bắt đầu miễn phí hoặc mở khóa thêm phân tích sức khỏe, AI hỗ trợ tham khảo và trải nghiệm Người ấy nâng cao.
        </p>
        {isCanceled && (
          <p className="mt-3 text-sm font-bold text-pink-600">
            Gói trả phí trước đó đã dừng. Bạn có thể chọn lại Hi Pro hoặc Hi Max khi cần.
          </p>
        )}
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3 lg:items-stretch">
        {plans.map((plan) => {
          const isFreePlan = plan.id === 'free';
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-[2rem] border bg-white p-7 transition-all duration-300 hover:-translate-y-1 ${
                plan.highlight
                  ? 'border-pink-300 shadow-xl shadow-pink-100/60 lg:scale-[1.03] lg:z-10'
                  : 'border-slate-200 hover:border-pink-200 hover:shadow-lg hover:shadow-slate-100'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 right-8 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-1 text-xs font-black uppercase tracking-wide text-white shadow-md">
                  {plan.badge}
                </span>
              )}

              <div>
                <p className="text-lg font-black text-slate-900">{plan.label}</p>
                {plan.basePrice ? (
                  <div className="mt-3 flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-400 line-through">{plan.basePrice}</p>
                    {plan.discountPercent ? <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-black text-pink-600">Tiết kiệm {plan.discountPercent}%</span> : null}
                  </div>
                ) : null}
                <div className="mt-4 flex items-baseline text-slate-900">
<span className={`text-4xl font-black tracking-tight ${!isFreePlan && plan.basePrice ? 'bg-gradient-to-r from-sky-500 via-violet-500 to-pink-500 bg-clip-text text-transparent' : ''}`}>{plan.price}</span>
                  <span className="ml-1 text-lg font-bold text-slate-400">{plan.period}</span>
                </div>
                <p className="mt-3 min-h-10 text-sm font-semibold leading-relaxed text-slate-500">{plan.description}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <span className="mr-3 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-pink-100 bg-pink-50 text-[10px] font-black text-pink-500">
                        ✓
                      </span>
                      <span className="text-sm font-semibold leading-snug text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                id={`btn-checkout-${plan.id}`}
                onClick={() => plan.priceId && checkout.mutate(plan.priceId)}
                disabled={isFreePlan || checkout.isPending}
                className={`mt-8 flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-black tracking-wide ${
                  isFreePlan
                    ? 'hi-btn-secondary text-slate-500'
                    : 'hi-btn-primary'
                }`}
              >
                {isFreePlan ? 'Đồng Hành Cơ Bản' : checkout.isPending ? 'Đang xử lý...' : `Đăng ký ${plan.label}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

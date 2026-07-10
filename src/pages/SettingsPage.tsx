import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../lib/api';
import { User } from '../types';
import PricingCard from '../components/PricingCard';
import { useSubscription, usePaymentHistory } from '../hooks/useSubscription';
import { getUserFacingError } from '../lib/userFacingError';

interface ProfileForm {
  name: string;
  birthDate: string;
  height: number | '';
  weight: number | '';
}

interface ProfileResponse {
  user?: User;
  data?: { user?: User };
}

function unwrapUser(response: ProfileResponse): User {
  const user = response.user ?? response.data?.user;
  if (!user) throw new Error('Phản hồi người dùng không hợp lệ');
  return user;
}

function normalizeNumber(value: number | '') {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { data: subscription } = useSubscription();
  const { data: transactions } = usePaymentHistory();
  const isPremium = subscription?.tier === 'PREMIUM';
  const planLabel = subscription?.plan === 'PREMIUM_YEARLY'
    ? 'Hi Max'
    : subscription?.plan === 'PREMIUM_MONTHLY'
      ? 'Hi Pro'
      : 'Đồng Hành Cơ Bản';
  const isMale = user?.gender === 'male';
  const accent = useMemo(() => (
    isMale
      ? {
          label: 'Hồ sơ nam',
          heroIcon: 'person',
          eyebrow: 'Không gian cá nhân',
          gradient: 'from-blue-500 to-indigo-500',
          softGradient: 'from-blue-50 to-indigo-50',
          text: 'text-blue-500',
          border: 'border-blue-100',
          focus: 'focus:border-blue-300 focus:ring-blue-50',
          shadow: 'shadow-blue-200/60',
        }
      : {
          label: 'Hồ sơ nữ',
          heroIcon: 'person',
          eyebrow: 'Không gian cá nhân',
          gradient: 'from-rose-500 to-pink-500',
          softGradient: 'from-pink-50 to-violet-50',
          text: 'text-pink-500',
          border: 'border-pink-100',
          focus: 'focus:border-pink-300 focus:ring-pink-50',
          shadow: 'shadow-pink-200/60',
        }
  ), [isMale]);

  const { register, handleSubmit } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name ?? '',
      birthDate: user?.birthDate?.slice(0, 10) ?? '',
      height: user?.height ?? '',
      weight: user?.weight ?? '',
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const payload: Partial<User> = {
        name: values.name.trim(),
        birthDate: values.birthDate || undefined,
        height: normalizeNumber(values.height),
        weight: normalizeNumber(values.weight),
      };
      const { data } = await api.put<ProfileResponse>('/users/profile', payload);
      return unwrapUser(data);
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Đã cập nhật hồ sơ!');
    },
    onError: (error: unknown) => {
      toast.error(getUserFacingError(error, 'Cập nhật thất bại'));
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur md:p-8">
        <div className={`pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br ${accent.softGradient} blur-3xl`} />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-100/45 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span className={`material-symbols-outlined text-[20px] ${accent.text}`}>manage_accounts</span>
              <span>{accent.eyebrow}</span>
            </div>
            <h1 className="hi-page-title text-3xl md:text-4xl">
              Cài đặt hồ sơ cá nhân
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
              Cập nhật thông tin cơ bản để Hi cá nhân hóa dashboard, dự đoán sức khỏe và các gợi ý hằng ngày chính xác hơn.
            </p>
          </div>
          <div className={`flex items-center gap-3 rounded-2xl border ${accent.border} bg-white/80 px-4 py-3 shadow-sm`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accent.gradient} text-white`}>
              <span className="material-symbols-outlined text-[20px]">{accent.heroIcon}</span>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{accent.label}</p>
              <p className="text-sm font-extrabold text-slate-800">{user?.name ?? 'Người dùng Hi'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className={`h-fit overflow-hidden border-white/80 bg-gradient-to-br ${accent.softGradient} shadow-sm`}>
          <div className="flex flex-col items-center text-center">
            <div className={`mb-4 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br ${accent.gradient} text-4xl font-black text-white shadow-lg ${accent.shadow}`}>
              {user?.name?.charAt(0).toUpperCase() ?? 'H'}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">{user?.name ?? 'Người dùng Hi'}</h2>
            <p className="mt-1 max-w-full truncate text-sm text-slate-500">{user?.email}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className={`rounded-full bg-white px-3 py-1 text-xs font-bold ${accent.text} shadow-sm`}>
                {user?.gender === 'female' ? 'Nữ' : user?.gender === 'male' ? 'Nam' : 'Khác'}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-600 shadow-sm">
                {user?.onboardingCompleted ? 'Đã onboarding' : 'Chưa onboarding'}
              </span>
            </div>

            {/* Subscription details block */}
            <div className="mt-6 w-full border-t border-slate-200/50 pt-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Gói đồng hành</p>
              {isPremium ? (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-pink-500/10 border border-amber-200/40 p-4 text-left shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-500/20">
                      <span className="material-symbols-outlined text-[20px] animate-pulse">workspace_premium</span>
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Gói Hi đang hoạt động</p>
                      <p className="text-[11px] font-bold text-pink-600 mt-0.5">{planLabel}</p>
                    </div>
                  </div>
                  {subscription?.currentPeriodEnd && (
                    <p className="text-[10px] text-slate-400 mt-3.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-slate-400">calendar_today</span>
                      Hạn dùng: {new Date(subscription.currentPeriodEnd).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-white/70 border border-slate-100 p-4 text-left shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <span className="material-symbols-outlined text-[20px]">face</span>
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Cơ Bản</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Trải nghiệm cơ bản</p>
                    </div>
                  </div>
                  <a
                    href="#btn-checkout-monthly"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('btn-checkout-monthly')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hi-btn-primary mt-3.5 block text-center rounded-xl py-2 px-4 text-xs font-bold"
                  >
                    Nâng cấp Hi Pro
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/90 shadow-sm backdrop-blur">
            <div className="mb-6">
              <h3 className="text-lg font-extrabold text-slate-900">Thông tin cá nhân</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Trang này chỉ dùng để chỉnh hồ sơ. Cài đặt thông báo và cặp đôi nằm ở trang riêng.
              </p>
            </div>
            <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
              <Input
                label="Họ và tên"
                className={accent.focus}
                {...register('name', { required: true })}
              />
              <Input
                label="Ngày sinh"
                type="date"
                className={accent.focus}
                {...register('birthDate')}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Chiều cao (cm)"
                  type="number"
                  className={accent.focus}
                  {...register('height', { valueAsNumber: true })}
                />
                <Input
                  label="Cân nặng (kg)"
                  type="number"
                  className={accent.focus}
                  {...register('weight', { valueAsNumber: true })}
                />
              </div>

              <div className={`rounded-2xl border ${accent.border} bg-gradient-to-br ${accent.softGradient} p-4`}>
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined mt-0.5 ${accent.text}`}>privacy_tip</span>
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">Dữ liệu hồ sơ được dùng để cá nhân hóa</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Chiều cao, cân nặng và ngày sinh giúp Hi đưa ra dự đoán phù hợp hơn với cơ thể của bạn.
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" loading={isPending}>
                <span className="material-symbols-outlined mr-2 text-[18px]">save</span>
                Lưu thay đổi
              </Button>
            </form>
          </Card>

          {/* Lịch sử giao dịch */}
          <Card className="border-white/80 bg-white/90 shadow-sm backdrop-blur p-6">
            <div className="mb-6">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-650 text-[22px]">history</span>
                Lịch sử giao dịch
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Xem lịch sử thanh toán và trạng thái các giao dịch nâng cấp tài khoản của bạn.
              </p>
            </div>

            {!transactions || transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-2xl border border-slate-100">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">payments</span>
                <p className="text-xs font-semibold text-slate-400">Chưa có lịch sử giao dịch nào.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white/60">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-4">Mã đơn</th>
                      <th className="py-2.5 px-4">Gói đăng ký</th>
                      <th className="py-2.5 px-4">Số tiền</th>
                      <th className="py-2.5 px-4">Ngày giao dịch</th>
                      <th className="py-2.5 px-4 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {transactions.map((tx) => {
                      const normalizedPlan = tx.plan?.toLowerCase();
                      const planText = normalizedPlan?.includes('yearly') ? 'Hi Max' : normalizedPlan?.includes('monthly') ? 'Hi Pro' : 'Nâng cấp';
                      const amountText = (tx.amount || 0).toLocaleString('vi-VN') + 'đ';
                      const dateText = tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '—';
                      
                      let statusBadge = (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          Chưa rõ
                        </span>
                      );
                      if (tx.status === 'completed') {
                        statusBadge = (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-100">
                            Thành công
                          </span>
                        );
                      } else if (tx.status === 'pending') {
                        statusBadge = (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-100">
                            Đang chờ
                          </span>
                        );
                      } else if (tx.status === 'canceled') {
                        statusBadge = (
                          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-200">
                            Đã hủy
                          </span>
                        );
                      } else if (tx.status === 'failed') {
                        statusBadge = (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-100">
                            Thất bại
                          </span>
                        );
                      } else if (tx.status === 'refunded') {
                        statusBadge = (
                          <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600 border border-violet-100">
                            Đã hoàn tiền
                          </span>
                        );
                      }

                      return (
                        <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">{tx.orderCode || '—'}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-700">{planText}</td>
                          <td className="py-2.5 px-4 font-extrabold text-slate-800">{amountText}</td>
                          <td className="py-2.5 px-4 text-slate-500">{dateText}</td>
                          <td className="py-2.5 px-4 text-center">{statusBadge}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Chính sách hủy gói & Hoàn tiền */}
          <Card className="border-white/80 bg-white/90 shadow-sm backdrop-blur p-6">
            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-650 text-[22px]">gavel</span>
                Chính sách hủy & Hoàn tiền
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs leading-relaxed text-slate-600">
              <div className="bg-slate-50/60 rounded-2xl border border-slate-100/70 p-4">
                <h4 className="font-bold text-slate-850 mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-500 text-[16px]">cancel</span>
                  Chính sách Hủy gói
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Hi Pro và Hi Max có thời hạn 30 hoặc 365 ngày. Một người trong cặp đôi mua thì cả hai cùng dùng đến ngày hết hạn.
                </p>
              </div>
              <div className="bg-slate-50/60 rounded-2xl border border-slate-100/70 p-4">
                <h4 className="font-bold text-slate-850 mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-500 text-[16px]">currency_exchange</span>
                  Chính sách Hoàn tiền
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Vì Hi Pro và Hi Max mở khóa nội dung số ngay lập tức, chúng tôi không hỗ trợ hoàn tiền sau khi giao dịch thành công. Nếu đã bị trừ tiền nhưng tài khoản chưa được nâng cấp sau 24 giờ, vui lòng liên hệ <a href="mailto:support@hilover.space" className="text-pink-500 font-semibold hover:underline">support@hilover.space</a> kèm mã giao dịch.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-8">
        <PricingCard />
      </div>
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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
import { Camera, CircleNotch } from '@phosphor-icons/react';

interface ProfileForm {
  name: string;
  birthDate: string;
  height: number | '';
  weight: number | '';
  irregularCycle: boolean;
  pregnant: boolean;
  postpartum: boolean;
  breastfeeding: boolean;
  hormonalContraception: boolean;
  perimenopause: boolean;
}

interface ProfileResponse {
  user?: User;
  data?: { user?: User };
}

interface PresignAvatarResponse {
  data?: {
    uploadUrl: string;
    objectKey: string;
    contentType: string;
    uploadMethod?: 'POST' | 'PUT';
    uploadParams?: Record<string, string | number | boolean>;
  };
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
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
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
      irregularCycle: user?.irregularCycle ?? false,
      pregnant: user?.pregnant ?? false,
      postpartum: user?.postpartum ?? false,
      breastfeeding: user?.breastfeeding ?? false,
      hormonalContraception: user?.hormonalContraception ?? false,
      perimenopause: user?.perimenopause ?? false,
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
      if (!isMale) {
        Object.assign(payload, {
          irregularCycle: values.irregularCycle,
          pregnant: values.pregnant,
          postpartum: values.postpartum,
          breastfeeding: values.breastfeeding,
          hormonalContraception: values.hormonalContraception,
          perimenopause: values.perimenopause,
        });
      }
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

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Avatar phải nhỏ hơn 5MB');
      }

      const { data: presignData } = await api.post<PresignAvatarResponse>('/users/avatar/presign', {
        fileName: file.name,
        contentType: file.type,
        contentLength: file.size,
      });
      const presigned = presignData.data;
      if (!presigned?.uploadUrl || !presigned.objectKey) {
        throw new Error('Không lấy được URL tải ảnh');
      }

      if (presigned.uploadMethod === 'POST') {
        const uploadForm = new FormData();
        Object.entries(presigned.uploadParams ?? {}).forEach(([key, value]) => {
          uploadForm.append(key, String(value));
        });
        uploadForm.append('file', file);
        await axios.post(presigned.uploadUrl, uploadForm, {
          withCredentials: false,
          timeout: 30_000,
        });
      } else {
        await axios.put(presigned.uploadUrl, file, {
          headers: { 'Content-Type': presigned.contentType || file.type },
          withCredentials: false,
          timeout: 30_000,
        });
      }

      const { data } = await api.post<ProfileResponse>('/users/avatar/confirm', {
        objectKey: presigned.objectKey,
      });
      return unwrapUser(data);
    },
    onSuccess: async (updatedUser) => {
      await queryClient.cancelQueries({ queryKey: ['profile-connection-poll', updatedUser._id] });
      queryClient.setQueryData(['profile-connection-poll', updatedUser._id], updatedUser);
      setUser(updatedUser);
      toast.success('Đã cập nhật avatar!');
    },
    onError: (error: unknown) => {
      toast.error(getUserFacingError(error, 'Tải avatar thất bại'));
    },
    onSettled: () => {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
    },
  });

  const handleAvatarChange = (file?: File) => {
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    avatarMutation.mutate(file);
  };

  const avatarUrl = avatarPreview ?? user?.avatar;
  const avatarInitial = user?.name?.trim().charAt(0).toUpperCase() ?? 'H';

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur md:p-8">
        <div className={`pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-gradient-to-br ${accent.softGradient} opacity-80 blur-3xl`} />
        <div className="relative mb-7 max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <span className={`material-symbols-outlined text-[20px] ${accent.text}`}>manage_accounts</span>
            <span>{accent.eyebrow}</span>
          </div>
          <h1 className="hi-page-title text-3xl md:text-4xl">Hồ sơ của bạn</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 md:text-base">
            Cập nhật thông tin để Hi cá nhân hóa trải nghiệm chăm sóc sức khỏe mỗi ngày.
          </p>
        </div>

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-start">
          <div className={`rounded-[1.75rem] border ${accent.border} bg-gradient-to-br ${accent.softGradient} p-5 md:p-7`}>
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
              <div className="relative shrink-0">
                <div className={`flex h-36 w-36 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-br ${accent.gradient} text-5xl font-black text-white shadow-xl ${accent.shadow} md:h-40 md:w-40`}>
                  {avatarUrl && failedAvatarUrl !== avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`Ảnh đại diện của ${user?.name ?? 'người dùng Hi'}`}
                      className="h-full w-full object-cover"
                      onError={() => setFailedAvatarUrl(avatarUrl)}
                    />
                  ) : (
                    avatarInitial
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarMutation.isPending}
                  aria-label="Đổi ảnh đại diện"
                  className={`absolute -bottom-2 -right-2 grid h-11 w-11 place-items-center rounded-2xl border-4 border-white bg-gradient-to-br ${accent.gradient} text-white shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-white/80 disabled:cursor-wait disabled:opacity-70`}
                >
                  {avatarMutation.isPending
                    ? <CircleNotch size={20} className="animate-spin" aria-hidden="true" />
                    : <Camera size={20} weight="bold" aria-hidden="true" />}
                </button>
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <p className={`text-xs font-extrabold ${accent.text}`}>{accent.label}</p>
                <h2 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                  {user?.name ?? 'Người dùng Hi'}
                </h2>
                <p className="mt-1 break-all text-sm font-medium text-slate-500">{user?.email}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <span className={`rounded-full border ${accent.border} bg-white/85 px-3 py-1 text-xs font-bold ${accent.text}`}>
                    {user?.gender === 'female' ? 'Nữ' : user?.gender === 'male' ? 'Nam' : 'Khác'}
                  </span>
                  <span className="rounded-full border border-emerald-100 bg-white/85 px-3 py-1 text-xs font-bold text-emerald-600">
                    {user?.onboardingCompleted ? 'Đã hoàn tất hồ sơ' : 'Chưa hoàn tất hồ sơ'}
                  </span>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => handleAvatarChange(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={avatarMutation.isPending}
                  className="mt-5"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera size={16} weight="bold" className="mr-1.5" aria-hidden="true" />
                  Đổi ảnh đại diện
                </Button>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400">JPG, PNG hoặc WebP, tối đa 5MB.</p>
              </div>
            </div>

            <div className="mt-6 border-t border-white/80 pt-5">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/75 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isPremium ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    <span className="material-symbols-outlined text-[20px]">{isPremium ? 'workspace_premium' : 'favorite'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500">Gói đồng hành</p>
                    <p className="truncate text-sm font-black text-slate-900">{planLabel}</p>
                  </div>
                </div>
                {!isPremium && (
                  <a
                    href="#btn-checkout-monthly"
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById('btn-checkout-monthly')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`shrink-0 text-xs font-extrabold ${accent.text} hover:underline`}
                  >
                    Nâng cấp
                  </a>
                )}
              </div>
              {isPremium && subscription?.currentPeriodEnd && (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Hạn dùng: {new Date(subscription.currentPeriodEnd).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6">
              <h3 className="text-xl font-extrabold text-slate-900">Thông tin cá nhân</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Những thông tin này giúp dự đoán sức khỏe phù hợp hơn với cơ thể bạn.
              </p>
            </div>
            <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
              <Input label="Họ và tên" className={accent.focus} {...register('name', { required: true })} />
              <Input label="Ngày sinh" type="date" className={accent.focus} {...register('birthDate')} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Chiều cao (cm)" type="number" className={accent.focus} {...register('height', { valueAsNumber: true })} />
                <Input label="Cân nặng (kg)" type="number" className={accent.focus} {...register('weight', { valueAsNumber: true })} />
              </div>
              {!isMale && (
                <fieldset className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                  <legend className="px-1 text-sm font-extrabold text-slate-800">Bối cảnh ảnh hưởng dự đoán chu kỳ</legend>
                  <p className="mb-3 mt-1 text-xs leading-relaxed text-slate-500">
                    Chọn đúng để Hi tạm ẩn dự đoán rụng trứng khi phương pháp theo lịch không phù hợp.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ['irregularCycle', 'Chu kỳ không đều'],
                      ['pregnant', 'Đang mang thai'],
                      ['postpartum', 'Đang trong giai đoạn sau sinh'],
                      ['breastfeeding', 'Đang cho con bú'],
                      ['hormonalContraception', 'Đang dùng biện pháp tránh thai nội tiết'],
                      ['perimenopause', 'Đang ở giai đoạn tiền mãn kinh'],
                    ].map(([field, label]) => (
                      <label key={field} className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2.5 text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-rose-200 text-rose-500 focus:ring-rose-200"
                          {...register(field as keyof ProfileForm)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <div className={`rounded-2xl border ${accent.border} bg-gradient-to-br ${accent.softGradient} p-4`}>
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined mt-0.5 ${accent.text}`}>privacy_tip</span>
                  <p className="text-xs font-semibold leading-relaxed text-slate-600">
                    Dữ liệu hồ sơ chỉ được dùng để cá nhân hóa trải nghiệm và dự đoán sức khỏe của bạn.
                  </p>
                </div>
              </div>
              <Button type="submit" loading={isPending}>
                <span className="material-symbols-outlined mr-2 text-[18px]">save</span>
                Lưu thay đổi
              </Button>
            </form>
          </div>
        </div>
      </section>

      <div className="space-y-6">
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

      <div className="mt-8 border-t border-slate-100 pt-8">
        <PricingCard />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import HiLogo from '../components/ui/HiLogo';
import { getUserFacingError } from '../lib/userFacingError';

const schema = z.object({
  newPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  confirmPassword: z.string().min(8, 'Vui lòng nhập lại mật khẩu'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu nhập lại chưa khớp',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ newPassword }: FormData) => {
    if (!token) {
      toast.error('Đường dẫn đặt lại mật khẩu không hợp lệ');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { newPassword });
      toast.success(data?.message || 'Đặt lại mật khẩu thành công');
      navigate('/login', { replace: true });
    } catch (error: unknown) {
      toast.error(getUserFacingError(error, 'Không thể đặt lại mật khẩu'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", background: '#f5f0fc' }}
    >
      <div className="pointer-events-none absolute -left-28 -top-32 h-[520px] w-[520px] rounded-full bg-sky-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-24 h-[520px] w-[520px] rounded-full bg-pink-200/60 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-2xl shadow-violet-200/30 backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="px-7 py-7 sm:px-10 lg:px-12">
          <Link to="/" className="mb-10 flex w-fit items-center gap-3">
            <HiLogo size={38} />
            <span className="hi-page-title text-xl">Hi Lover</span>
          </Link>

          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold tracking-wide text-purple-500">
              <span className="material-symbols-outlined text-sm">password</span>
              Bảo mật tài khoản
            </div>
            <h1 className="hi-page-title text-3xl">Đặt lại mật khẩu</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              Tạo mật khẩu mới mạnh hơn để bảo vệ dữ liệu sức khỏe và lịch sử trò chuyện của bạn.
            </p>
          </div>

          <form data-guide="auth-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800">Mật khẩu mới</label>
              <div className="relative">
                <input
                  {...register('newPassword')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">lock</span>
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600">
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
              {errors.newPassword && <p className="pl-1 text-xs text-red-500">{errors.newPassword.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800">Nhập lại mật khẩu</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">lock_reset</span>
              </div>
              {errors.confirmPassword && <p className="pl-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting || !token} className="hi-btn-primary h-12 w-full gap-2 rounded-xl text-sm font-bold">
              {isSubmitting ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <span>Cập nhật mật khẩu</span>
                  <span className="material-symbols-outlined text-xl">check</span>
                </>
              )}
            </button>

            <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Quay lại đăng nhập
            </Link>
          </form>
        </section>

        <aside className="hidden bg-gradient-to-br from-pink-50 via-violet-50 to-sky-50 p-8 lg:flex lg:flex-col lg:justify-center">
          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-xl shadow-pink-100/40">
            <span className="material-symbols-outlined text-4xl text-violet-400">lock_reset</span>
            <h2 className="mt-5 text-2xl font-black text-slate-900">Một mật khẩu mới, một khởi đầu gọn gàng</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Sau khi cập nhật, bạn có thể đăng nhập lại và tiếp tục theo dõi sức khỏe trong Hi.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

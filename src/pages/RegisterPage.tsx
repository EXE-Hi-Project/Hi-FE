import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import HiLogo from '../components/ui/HiLogo';
import { trackEvent } from '../utils/analytics';
import { buildGoogleOAuthUrl, extractSafeNextPath, getSafeNextPath } from '../lib/googleAuth';
import { getUserFacingError } from '../lib/userFacingError';

const schema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  confirmPassword: z.string(),
  gender: z.enum(['female', 'male']),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Mật khẩu nhập lại không khớp',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

function loadFacebookSdk() {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
  if (!appId) return Promise.reject(new Error('Thiếu VITE_FACEBOOK_APP_ID'));
  if (window.FB) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById('facebook-jssdk');
    const timeout = window.setTimeout(() => reject(new Error('Facebook SDK tải quá lâu')), 10000);

    (window as any).fbAsyncInit = () => {
      window.clearTimeout(timeout);
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v19.0',
      });
      resolve();
    };

    if (existingScript) return;

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/vi_VN/sdk.js';
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Không thể tải Facebook SDK'));
    };
    document.body.appendChild(script);
  });
}

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { score: 1, label: 'Mật khẩu yếu', color: 'bg-red-500' },
    { score: 2, label: 'Mật khẩu trung bình', color: 'bg-yellow-400' },
    { score: 3, label: 'Mật khẩu khá mạnh', color: 'bg-[#eb477e]' },
    { score: 4, label: 'Mật khẩu rất mạnh', color: 'bg-green-500' },
  ];
  return map[Math.min(score, 4) - 1] ?? { score: 0, label: '', color: '' };
}

export default function RegisterPage() {
  const { register: registerUser, socialLogin, verifyActivation, resendActivation, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);

  const navigateAfterLogin = (user: ReturnType<typeof useAuthStore.getState>['user']) => {
    if (!user) return;
    let destination = '/male-dashboard';
    if (user.role === 'admin') destination = '/admin';
    else if (!user.onboardingCompleted) destination = '/onboarding';
    else if (user.gender === 'female') destination = '/female-dashboard';
    navigate(getSafeNextPath(location.search, destination));
  };

  const handleGoogleLogin = () => {
    try {
      const nextPath = extractSafeNextPath(location.search) ?? undefined;
      window.location.assign(buildGoogleOAuthUrl(nextPath));
    } catch (err) {
      toast.error(getUserFacingError(err, 'Không thể bắt đầu đăng nhập Google'));
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await loadFacebookSdk();
    } catch (err: any) {
      return toast.error(getUserFacingError(err, 'Không thể bắt đầu đăng nhập Facebook'));
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        const { accessToken, userID } = response.authResponse;
        socialLogin('facebook', { accessToken, userID })
          .then((user) => navigateAfterLogin(user))
          .catch((err: any) => toast.error(getUserFacingError(err, 'Đăng nhập Facebook thất bại')));
      }
    }, { scope: 'email,public_profile' });
  };

  useEffect(() => {
    const t = setInterval(() => setActiveSlide(s => (s + 1) % 3), 4000);
    return () => clearInterval(t);
  }, []);

  const slides = [
    {
      topCard: { icon: 'calendar_month', label: 'Theo dõi chu kỳ', value: 'Cá nhân hóa' },
      bottomCard: { icon: 'auto_awesome', text: 'Gợi ý dựa trên dữ liệu sức khỏe thật của bạn' },
    },
    {
      topCard: { icon: 'mood', label: 'Triệu chứng', value: 'Ghi nhận' },
      bottomCard: { icon: 'spa', text: 'Theo dõi cảm giác cơ thể theo từng ngày' },
    },
    {
      topCard: { icon: 'favorite', label: 'Bạn đời', value: 'Kết nối' },
      bottomCard: { icon: 'favorite', text: 'Chia sẻ thông tin khi bạn chủ động cho phép' },
    },
  ];

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'female' },
  });

  const password = watch('password', '');
  const strength = getStrength(password);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await registerUser(data);
      if (res && res.pendingActivation) {
        setPendingEmail(res.email);
        setShowOtpScreen(true);
        toast.success(res.existingPendingAccount
          ? 'Tài khoản đang chờ kích hoạt. Bạn có thể nhập OTP hoặc yêu cầu mã mới.'
          : 'Đăng ký thành công! Vui lòng nhập mã OTP để kích hoạt tài khoản.');
      } else {
        trackEvent('REGISTER', 'register_page');
        toast.success('Đăng ký thành công!');
        navigate(getSafeNextPath(location.search, '/onboarding'));
      }
    } catch (err: unknown) {
      const authError = err as Error & { code?: string; email?: string };
      if (authError.code === 'OTP_DELIVERY_FAILED') {
        setPendingEmail(authError.email || data.email.trim().toLowerCase());
        setShowOtpScreen(true);
      }
      toast.error(getUserFacingError(err, 'Có lỗi xảy ra'));
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      return toast.error('Mã OTP phải đúng 6 chữ số');
    }
    try {
      await verifyActivation(pendingEmail, otp);
      trackEvent('REGISTER', 'register_page');
      toast.success('Kích hoạt tài khoản thành công!');
      navigate(getSafeNextPath(location.search, '/onboarding'));
    } catch (err: any) {
      toast.error(getUserFacingError(err, 'Xác minh OTP thất bại'));
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      await resendActivation(pendingEmail);
      toast.success('Mã OTP mới đã được gửi đến email của bạn.');
    } catch (err: any) {
      toast.error(getUserFacingError(err, 'Gửi lại mã OTP thất bại'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="auth-shell min-h-screen flex items-center justify-center p-4 lg:p-6 relative overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", background: '#f5f0fc' }}
    >
      <div className="auth-ambient-effect contents" aria-hidden="true">
      {/* ===== Animated blobs — blue + pink mix ===== */}
      <div className="absolute pointer-events-none" style={{ width: 560, height: 560, borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%', background: 'radial-gradient(circle at 40% 40%, #c9e8f8 0%, #b8d4f5 50%, transparent 80%)', top: '-160px', left: '-140px', animation: 'morphBlob1 12s ease-in-out infinite', opacity: 0.75, filter: 'blur(55px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 500, height: 500, borderRadius: '40% 60% 30% 70% / 60% 40% 70% 30%', background: 'radial-gradient(circle at 60% 60%, #f9c2db 0%, #f4a8cb 55%, transparent 80%)', bottom: '-160px', right: '-120px', animation: 'morphBlob2 14s ease-in-out infinite 2s', opacity: 0.70, filter: 'blur(55px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 380, height: 380, borderRadius: '50% 50% 40% 60% / 40% 60% 50% 50%', background: 'radial-gradient(circle at 50% 50%, #ddb8f0 0%, #c8a8e8 60%, transparent 80%)', top: '45%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'morphBlob3 16s ease-in-out infinite 1s', opacity: 0.50, filter: 'blur(50px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 300, height: 300, borderRadius: '70% 30% 50% 50% / 30% 70% 50% 50%', background: 'radial-gradient(circle at 50% 50%, #a8e8f0 0%, #8dd4ea 60%, transparent 80%)', top: '15%', right: '10%', animation: 'morphBlob4 10s ease-in-out infinite 3s', opacity: 0.55, filter: 'blur(45px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 260, height: 260, borderRadius: '30% 70% 60% 40% / 60% 30% 70% 40%', background: 'radial-gradient(circle at 50% 50%, #f9d4e8 0%, #f0b8d4 60%, transparent 80%)', bottom: '10%', left: '15%', animation: 'morphBlob5 11s ease-in-out infinite 4s', opacity: 0.60, filter: 'blur(40px)' }} />

      {/* Floating orbs that drift across */}
      <div className="absolute pointer-events-none rounded-full" style={{ width: 18, height: 18, background: 'linear-gradient(135deg,#7ecae8,#c9a8f0)', top: '20%', left: '8%', animation: 'driftOrb1 18s ease-in-out infinite', opacity: 0.55, filter: 'blur(1px)' }} />
      <div className="absolute pointer-events-none rounded-full" style={{ width: 12, height: 12, background: 'linear-gradient(135deg,#f9a8c9,#eb477e)', top: '70%', right: '7%', animation: 'driftOrb2 22s ease-in-out infinite 3s', opacity: 0.50, filter: 'blur(1px)' }} />
      <div className="absolute pointer-events-none rounded-full" style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#a8dff0,#f9c2d4)', bottom: '25%', left: '5%', animation: 'driftOrb3 15s ease-in-out infinite 6s', opacity: 0.45, filter: 'blur(2px)' }} />

      </div>

      {/* ===== Card (horizontal rectangle) ===== */}
      <div
        className="auth-glass-panel relative w-full flex overflow-hidden"
        style={{ borderRadius: 28, boxShadow: '0 24px 70px rgba(180,130,220,0.18), 0 6px 28px rgba(168,200,240,0.18)', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', maxWidth: 1060, minHeight: 0 }}
      >
      {/* ===== LEFT PANEL ===== */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white/80" style={{ scrollbarWidth: 'none' }}>

        {/* Logo */}
        <Link to="/" className="px-5 py-5 sm:px-8 lg:px-12 lg:py-6 flex items-center gap-3 flex-shrink-0 w-fit">
          <HiLogo size={38} />
          <span
            className="text-xl font-black tracking-tight"
            style={{ background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >Hi Lover</span>
        </Link>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center px-5 sm:px-8 lg:px-12 xl:px-16 pb-6">

          {showOtpScreen ? (
            <div className="animate-fade-in flex flex-col justify-center">
              {/* OTP Header */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-xs font-bold tracking-wide" style={{ background: 'linear-gradient(135deg,#e0f2fe,#fff1f2)', color: '#0284c7' }}>
                  <span className="material-symbols-outlined text-sm">mail</span>
                  Kích hoạt tài khoản
                </div>
                <h1 className="hi-heading text-3xl font-black tracking-tight mb-1.5 leading-tight">Xác thực Email</h1>
                <p className="text-sm text-gray-500">
                  Hi đã gửi mã kích hoạt 6 chữ số đến email <strong className="text-slate-700">{pendingEmail}</strong>. Bạn kiểm tra hộp thư nhé!
                </p>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800">Nhập mã OTP</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Mã OTP 6 số"
                      className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-black tracking-[0.4em] text-gray-800 placeholder:text-gray-300 placeholder:tracking-normal outline-none transition-all focus:bg-white focus:border-[#9ab8f0] focus:ring-4 focus:ring-blue-50"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg select-none">key</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="lp-btn-gradient mt-1 w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      <span>Kích hoạt tài khoản</span>
                      <span className="material-symbols-outlined text-xl">verified</span>
                    </>
                  )}
                </button>
              </form>

              {/* Resend OTP */}
              <div className="mt-6 flex flex-col items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="text-xs font-bold text-sky-600 hover:underline disabled:opacity-50"
                >
                  {resending ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpScreen(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Quay lại đăng ký
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header — no steps */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-xs font-bold tracking-wide" style={{ background: 'linear-gradient(135deg,#e8f4fd,#fce8f1)', color: '#8a6bcc' }}>
                  <span className="material-symbols-outlined text-sm">favorite</span>
                  Chào mừng bạn
                </div>
                <h1
                  className="hi-heading text-3xl font-black tracking-tight mb-1.5 leading-tight"
                >Bắt đầu hành trình</h1>
                <p className="text-sm text-gray-400">Tạo tài khoản để AI thấu hiểu chu kỳ của bạn.</p>
              </div>

              {/* Form — 2-col grid for compact horizontal feel */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

                {/* Row 1: Name + Email */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800">Họ và tên</label>
                  <div className="relative">
                    <input
                      {...register('name')}
                      type="text"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-[#9ab8f0] focus:ring-4 focus:ring-blue-50"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg select-none">person</span>
                  </div>
                  {errors.name && <p className="text-xs text-red-500 pl-1">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800">Email</label>
                  <div className="relative">
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="name@example.com"
                      className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-[#9ab8f0] focus:ring-4 focus:ring-blue-50"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg select-none">mail</span>
                  </div>
                  {errors.email && <p className="text-xs text-red-500 pl-1">{errors.email.message}</p>}
                </div>
                </div>

                {/* Row 2: Password + Confirm */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800">Mật khẩu</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Tối thiểu 8 ký tự"
                      className="w-full h-11 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-[#9ab8f0] focus:ring-4 focus:ring-blue-50"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg select-none">lock</span>
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="pt-0.5">
                      <div className="flex gap-1 mb-1">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < strength.score ? strength.color : 'bg-gray-100'}`} />
                        ))}
                      </div>
                      <p className="text-xs font-semibold" style={{ color: '#9b59d0' }}>{strength.label}</p>
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-red-500 pl-1">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800">Nhập lại mật khẩu</label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full h-11 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-[#9ab8f0] focus:ring-4 focus:ring-blue-50"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg select-none">lock_reset</span>
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      <span className="material-symbols-outlined text-lg">{showConfirm ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 pl-1">{errors.confirmPassword.message}</p>}
                </div>
                </div>

                {/* Hidden gender */}
                <input type="hidden" value="female" {...register('gender')} />

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="lp-btn-gradient mt-1 w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isLoading
                    ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    : <><span>Tiếp tục</span><span className="material-symbols-outlined text-xl">arrow_forward</span></>
                  }
                </button>
              </form>

              {/* Social login */}
              <div className="mt-5">
                <div className="relative flex items-center mb-4">
                  <div className="flex-grow border-t border-gray-100" />
                  <span className="mx-4 text-gray-400 text-xs font-semibold uppercase tracking-widest flex-shrink-0">Hoặc đăng ký qua</span>
                  <div className="flex-grow border-t border-gray-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={handleGoogleLogin} className="flex items-center justify-center gap-2 h-12 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all text-sm font-semibold text-gray-700">
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </button>
                  <button type="button" onClick={handleFacebookLogin} className="flex items-center justify-center gap-2 h-12 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all text-sm font-semibold text-gray-700">
                    <svg className="w-5 h-5 flex-shrink-0 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </button>
                </div>
              </div>

              <p className="mt-5 text-center text-sm text-gray-500">
                Đã có tài khoản?{' '}
                <Link to="/login" className="font-bold hover:underline" style={{ color: '#eb477e' }}>Đăng nhập ngay</Link>
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-8 lg:px-12 py-4 flex-shrink-0">
          <div className="flex gap-6 text-xs text-gray-400">
            <Link to="/terms" className="hover:text-gray-600 transition-colors">Điều khoản sử dụng</Link>
            <Link to="/privacy" className="hover:text-gray-600 transition-colors">Chính sách bảo mật</Link>
            <Link to="/help" className="hover:text-gray-600 transition-colors">Trợ giúp</Link>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="hidden lg:flex w-[430px] xl:w-[470px] flex-shrink-0 relative flex-col items-center justify-center overflow-hidden p-8" style={{ background: 'linear-gradient(155deg, #fdf0f7 0%, #fde8f2 40%, #e8f4fd 100%)' }}>
        {/* Subtle bg circles */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.5)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none"
          style={{ background: 'rgba(235,71,126,0.06)' }} />

        <div className="relative z-10 w-full max-w-md flex flex-col items-center">
          {/* Carousel */}
          <div className="relative w-full mb-5 rounded-3xl overflow-hidden" style={{ aspectRatio: '4/3', boxShadow: '0 24px 50px -12px rgba(235,71,126,0.22)' }}>
            {slides.map((slide, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-all duration-700"
                style={{ opacity: i === activeSlide ? 1 : 0, transform: i === activeSlide ? 'scale(1)' : 'scale(1.03)', pointerEvents: i === activeSlide ? 'auto' : 'none' }}
              >
                <img
                  src="/images/LogRe.webp"
                  alt="Sức khỏe phái đẹp"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(235,71,126,0.18) 0%, transparent 55%)' }} />

                {/* Top floating card */}
                <div className="absolute right-3 top-3 bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
                  style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.12)', animation: 'floatY 4s ease-in-out infinite' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#fce7f3,#e8f4fd)' }}>
                    <span className="material-symbols-outlined text-[16px]" style={{ color: '#eb477e' }}>{slide.topCard.icon}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium leading-none mb-0.5">{slide.topCard.label}</p>
                    <p className="text-xs font-bold text-gray-800">{slide.topCard.value}</p>
                  </div>
                </div>

                {/* Bottom floating card */}
                <div className="absolute left-3 bottom-3 bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2.5 max-w-[175px]"
                  style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.12)', animation: 'floatY 5s ease-in-out infinite 1s' }}>
                  <div className="flex gap-1.5 items-start">
                    <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5" style={{ color: '#eb477e' }}>{slide.bottomCard.icon}</span>
                    <p className="text-[11px] font-medium text-gray-600 leading-snug">{slide.bottomCard.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex gap-2 mb-4">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className="rounded-full transition-all duration-400"
                style={{
                  width: i === activeSlide ? 28 : 8,
                  height: 8,
                  background: i === activeSlide
                    ? 'linear-gradient(90deg, #7ecae8, #f9a8c9)'
                    : 'rgba(235,71,126,0.18)',
                }}
              />
            ))}
          </div>

          {/* Text */}
          <div className="text-center">
            <h3 className="text-xl font-black text-gray-900 leading-snug mb-2">
              Bạn đồng hành <span style={{ color: '#eb477e' }}>thông minh</span><br />cho sức khỏe phái đẹp
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Theo dõi chu kỳ, nhận lời khuyên dinh dưỡng và tâm lý được cá nhân hóa bởi AI mỗi ngày.
            </p>
          </div>
        </div>

        <style>{`
          @keyframes floatY {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes morphBlob1 {
            0%, 100% { transform: translate(0,0) scale(1); border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%; }
            33% { transform: translate(70px, 45px) scale(1.10); border-radius: 40% 60% 50% 50% / 60% 40% 60% 40%; }
            66% { transform: translate(-35px, 65px) scale(0.92); border-radius: 70% 30% 40% 60% / 40% 70% 30% 60%; }
          }
          @keyframes morphBlob2 {
            0%, 100% { transform: translate(0,0) scale(1); border-radius: 40% 60% 30% 70% / 60% 40% 70% 30%; }
            33% { transform: translate(-60px, -45px) scale(1.08); border-radius: 60% 40% 60% 40% / 40% 60% 40% 60%; }
            66% { transform: translate(45px, -65px) scale(0.95); border-radius: 30% 70% 50% 50% / 70% 30% 60% 40%; }
          }
          @keyframes morphBlob3 {
            0%, 100% { transform: translate(-50%,-50%) scale(1); border-radius: 50% 50% 40% 60% / 40% 60% 50% 50%; }
            50% { transform: translate(-50%,-50%) scale(1.20); border-radius: 40% 60% 60% 40% / 60% 40% 50% 50%; }
          }
          @keyframes morphBlob4 {
            0%, 100% { transform: translate(0,0) scale(1); border-radius: 70% 30% 50% 50% / 30% 70% 50% 50%; }
            50% { transform: translate(-25px, 30px) scale(1.12); border-radius: 50% 50% 30% 70% / 50% 50% 70% 30%; }
          }
          @keyframes morphBlob5 {
            0%, 100% { transform: translate(0,0) scale(1); border-radius: 30% 70% 60% 40% / 60% 30% 70% 40%; }
            50% { transform: translate(20px, -25px) scale(1.10); border-radius: 60% 40% 40% 60% / 40% 60% 40% 60%; }
          }
          @keyframes driftOrb1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(60px, -40px) scale(1.15); }
            50% { transform: translate(120px, 20px) scale(0.90); }
            75% { transform: translate(50px, 60px) scale(1.05); }
          }
          @keyframes driftOrb2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-70px, -50px) scale(1.20); }
            66% { transform: translate(-30px, -90px) scale(0.85); }
          }
          @keyframes driftOrb3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            40% { transform: translate(80px, -60px) scale(1.25); }
            70% { transform: translate(40px, -120px) scale(0.80); }
          }
        `}</style>
      </div>
      </div>
    </div>
  );
}

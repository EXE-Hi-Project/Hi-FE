import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import HiLogo from '../components/ui/HiLogo';
import { getUserFacingError } from '../lib/userFacingError';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!emailInput.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email: emailInput.trim() });
      setEmail(emailInput.trim());
      setStep(2);
      toast.success('Mã OTP đã được gửi đến email của bạn');
    } catch (error: unknown) {
      toast.error(getUserFacingError(error, 'Không thể gửi mã OTP'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    event.preventDefault();
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      toast.error('Vui lòng nhập đủ 6 số');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp: code });
      const resetToken: string | undefined = data?.data?.resetToken;
      if (!resetToken) throw new Error('Không nhận được mã đặt lại mật khẩu');
      toast.success('Xác minh thành công');
      navigate(`/reset-password/${encodeURIComponent(resetToken)}`, { replace: true });
    } catch (error: unknown) {
      toast.error(getUserFacingError(error, 'Mã OTP không đúng'));
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
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

          {step === 1 ? (
            <>
              <div className="mb-7">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1 text-xs font-bold tracking-wide text-pink-500">
                  <span className="material-symbols-outlined text-sm">mail_lock</span>
                  Lấy lại quyền truy cập
                </div>
                <h1 className="hi-page-title text-3xl">Quên mật khẩu</h1>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  Nhập email tài khoản Hi, tụi mình sẽ gửi mã OTP để bạn đặt lại mật khẩu.
                </p>
              </div>

              <form data-guide="auth-form" onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-800">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(event) => setEmailInput(event.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">mail</span>
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="hi-btn-primary h-12 w-full gap-2 rounded-xl text-sm font-bold">
                  {isSubmitting ? (
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      <span>Gửi mã OTP</span>
                      <span className="material-symbols-outlined text-xl">send</span>
                    </>
                  )}
                </button>
                <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700">
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Quay lại đăng nhập
                </Link>
              </form>
            </>
          ) : (
            <>
              <div className="mb-7">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold tracking-wide text-emerald-600">
                  <span className="material-symbols-outlined text-sm">mark_email_read</span>
                  Kiểm tra hộp thư
                </div>
                <h1 className="hi-page-title text-3xl">Nhập mã OTP</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Mã 6 số đã được gửi đến <span className="font-semibold text-slate-700">{email}</span>. Có hiệu lực trong 15 phút.
                </p>
              </div>

              <form data-guide="auth-form" onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => { inputRefs.current[index] = element; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      className={`h-14 w-full rounded-xl border-2 text-center text-xl font-black text-slate-800 outline-none transition-all ${
                        digit ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-slate-50'
                      } focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-50`}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || otp.join('').length < 6}
                  className="hi-btn-primary h-12 w-full gap-2 rounded-xl text-sm font-bold"
                >
                  {isSubmitting ? (
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      <span>Xác nhận mã OTP</span>
                      <span className="material-symbols-outlined text-xl">verified</span>
                    </>
                  )}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); }}
                    className="flex items-center gap-1.5 font-semibold text-slate-500 transition-colors hover:text-slate-700"
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Đổi email
                  </button>
                  <button type="button" disabled={isSubmitting} onClick={handleSendOtp as unknown as React.MouseEventHandler} className="font-semibold text-rose-500 transition-colors hover:text-rose-700 disabled:opacity-50">
                    Gửi lại mã
                  </button>
                </div>
              </form>
            </>
          )}
        </section>

        <aside className="hidden bg-gradient-to-br from-pink-50 via-violet-50 to-sky-50 p-8 lg:flex lg:flex-col lg:justify-center">
          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-xl shadow-pink-100/40">
            <span className="material-symbols-outlined text-4xl text-pink-400">verified_user</span>
            <h2 className="mt-5 text-2xl font-black text-slate-900">Bảo vệ dữ liệu sức khỏe của bạn</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Hi chỉ dùng OTP để xác minh yêu cầu đặt lại mật khẩu. Không chia sẻ dữ liệu cá nhân cho người khác.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

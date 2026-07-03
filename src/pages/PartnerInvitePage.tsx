import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePartnerConnection } from '../hooks/usePartnerConnection';
import HiLogo from '../components/ui/HiLogo';
import { normalizePartnerInviteCode } from '../utils/partnerInvite';

export default function PartnerInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, user, isBootstrapping } = useAuthStore();
  const { connectPartner } = usePartnerConnection();
  const code = normalizePartnerInviteCode(searchParams.get('code'));
  const nextPath = `/connect?${new URLSearchParams({ code }).toString()}`;
  const loginPath = `/login?${new URLSearchParams({ next: nextPath }).toString()}`;
  const registerPath = `/register?${new URLSearchParams({ next: nextPath }).toString()}`;

  if (isBootstrapping) return null;
  if (!code) return <Navigate to="/" replace />;

  const connected = Boolean(user?.partnerId);
  const dashboardPath = user?.gender === 'female' ? '/female-dashboard' : '/male-dashboard';

  const connect = () => {
    connectPartner.mutate(code, {
      onSuccess: () => {
        navigate(user?.onboardingCompleted ? dashboardPath : '/onboarding', { replace: true });
      },
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-sky-50 px-4 py-8 font-sans text-slate-900">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center text-center">
        <HiLogo size={64} radius={24} />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-pink-500">Kết nối cặp đôi</p>
        <h1 className="hi-page-title mt-3 text-3xl md:text-4xl">Người ấy đang mời bạn kết nối</h1>
        <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
          Sau khi kết nối, hai bạn có thể chia sẻ dữ liệu đã cho phép, nhận câu hỏi hằng ngày và gợi ý chăm sóc từ Hi.
        </p>

        <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Mã mời hôm nay</p>
          <p className="mt-2 text-3xl font-black tracking-[0.25em] text-slate-900">{code}</p>
        </div>

        {!token ? (
          <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
            <Link to={loginPath} className="hi-btn-secondary min-h-[48px] justify-center rounded-2xl px-5 py-3 text-sm font-black">
              Đăng nhập để kết nối
            </Link>
            <Link to={registerPath} className="hi-btn-primary min-h-[48px] justify-center rounded-2xl px-5 py-3 text-sm font-black">
              Đăng ký rồi kết nối
            </Link>
          </div>
        ) : connected ? (
          <Link to={dashboardPath} className="hi-btn-primary mt-7 min-h-[48px] justify-center rounded-2xl px-6 py-3 text-sm font-black">
            Bạn đã có kết nối
          </Link>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={connectPartner.isPending}
            className="hi-btn-primary mt-7 min-h-[48px] rounded-2xl px-7 py-3 text-sm font-black disabled:cursor-wait disabled:opacity-70"
          >
            {connectPartner.isPending ? 'Đang kết nối...' : 'Kết nối với Người ấy'}
          </button>
        )}
      </section>
    </main>
  );
}

import { Link } from 'react-router-dom';
import HiLogo from '../ui/HiLogo';

interface SiteFooterProps {
  tone?: 'rose' | 'blue' | 'admin' | 'neutral';
  className?: string;
}

const toneStyles = {
  rose: {
    glow: 'from-pink-200/55 via-violet-100/45 to-sky-100/50',
    link: 'hover:text-pink-500',
    badge: 'from-sky-300 via-violet-400 to-pink-400',
  },
  blue: {
    glow: 'from-sky-200/60 via-blue-100/45 to-pink-100/35',
    link: 'hover:text-blue-500',
    badge: 'from-sky-300 via-blue-400 to-violet-400',
  },
  admin: {
    glow: 'from-violet-200/55 via-sky-100/45 to-pink-100/45',
    link: 'hover:text-violet-500',
    badge: 'from-violet-400 via-sky-400 to-pink-400',
  },
  neutral: {
    glow: 'from-sky-100/50 via-violet-100/45 to-pink-100/45',
    link: 'hover:text-slate-900',
    badge: 'from-sky-300 via-violet-400 to-pink-400',
  },
};

const productLinks = [
  ['Tổng quan', '/female-dashboard'],
  ['Chu kỳ', '/cycles'],
  ['Gói Đồng Hành', '/#pricing'],
  ['Cài đặt', '/settings/notifications'],
];

const resourceLinks = [
  ['Kiến thức', '/kien-thuc'],
  ['Điều khoản', '/terms'],
  ['Bảo mật', '/privacy'],
  ['Trợ giúp', '/help'],
  ['Đăng nhập', '/login'],
];

export default function SiteFooter({ tone = 'neutral', className = '' }: SiteFooterProps) {
  const styles = toneStyles[tone];
  const linkClass = `text-sm font-bold text-slate-500 transition-colors ${styles.link}`;

  return (
    <footer className={`px-4 pb-8 pt-4 ${className}`}>
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-[0_24px_80px_rgba(148,163,184,0.22)] backdrop-blur-2xl md:p-8">
          <div className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br ${styles.glow} blur-3xl`} />
          <div className={`pointer-events-none absolute -bottom-28 left-16 h-64 w-64 rounded-full bg-gradient-to-tr ${styles.glow} blur-3xl`} />

          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.8fr_0.8fr_0.9fr]">
            <div>
              <div className="flex items-center gap-3">
                <HiLogo size={42} />
                <div>
                  <p className="bg-gradient-to-r from-slate-950 via-blue-600 to-pink-500 bg-clip-text text-2xl font-black tracking-tight text-transparent">
                    HiLover
                  </p>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-300">Wellness companion</p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
                HiLover giúp bạn theo dõi chu kỳ, cảm xúc và sức khỏe sinh sản bằng một trải nghiệm riêng tư, mềm mại và dễ hiểu.
              </p>
              <div className={`mt-5 inline-flex rounded-full bg-gradient-to-r ${styles.badge} p-[1px] shadow-lg`}>
                <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-black text-slate-700">
                  Dữ liệu cá nhân là của bạn. Dự đoán luôn là tham khảo.
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Sản phẩm</p>
              <div className="mt-4 grid gap-2">
                {productLinks.map(([label, href]) => href.startsWith('/#') ? (
                  <a key={href} className={linkClass} href={href}>{label}</a>
                ) : (
                  <Link key={href} className={linkClass} to={href}>{label}</Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Tài nguyên</p>
              <div className="mt-4 grid gap-2">
                {resourceLinks.map(([label, href]) => (
                  <Link key={href} className={linkClass} to={href}>{label}</Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Cộng đồng & liên hệ</p>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-500">
                <a className={`inline-flex items-center gap-2 ${linkClass}`} href="mailto:hilover.space@gmail.com">
                  <span className="material-symbols-outlined text-lg">mail</span>
                  hilover.space@gmail.com
                </a>
                <a
                  className={`inline-flex items-center gap-2 ${linkClass}`}
                  href="https://www.facebook.com/share/1HJnvBpE6L/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="material-symbols-outlined text-lg">groups</span>
                  Facebook Hi
                </a>
                <p className="pt-2 text-xs font-bold text-slate-400">© 2026 HiLover. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

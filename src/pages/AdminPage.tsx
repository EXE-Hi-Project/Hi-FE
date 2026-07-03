import { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BellRinging,
  ChartPieSlice,
  Cpu,
  CurrencyCircleDollar,
  List,
  Pulse,
  Question,
  Storefront,
  Tag,
  Users,
  VideoCamera,
  X,
} from '@phosphor-icons/react';
import HiLogo from '../components/ui/HiLogo';
import PageBackdrop from '../components/layout/PageBackdrop';
import { useAuthStore } from '../store/authStore';
import type { AdminTab } from '../components/admin/adminTypes';
import AdminPanelSkeleton from '../components/admin/AdminPanelSkeleton';

const AdminOverviewPanel = lazy(() => import('../components/admin/AdminOverviewPanel'));
const AdminAnalyticsPanel = lazy(() => import('../components/admin/AdminAnalyticsPanel'));
const AdminRevenuePanel = lazy(() => import('../components/admin/AdminRevenuePanel'));
const AdminPricingPanel = lazy(() => import('../components/admin/AdminPricingPanel'));
const AdminUsersPanel = lazy(() => import('../components/admin/AdminUsersPanel'));
const HealthVideoAdminPanel = lazy(() => import('../components/admin/HealthVideoAdminPanel'));
const AdminDailyQuestionsPanel = lazy(() => import('../components/admin/AdminDailyQuestionsPanel'));
const AffiliateAdminPanel = lazy(() => import('../components/admin/AffiliateAdminPanel'));
const AdminNotificationsPanel = lazy(() => import('../components/admin/AdminNotificationsPanel'));
const AdminSystemPanel = lazy(() => import('../components/admin/AdminSystemPanel'));

const NAV_ITEMS = [
  { id: 'overview', label: 'Tổng quan', description: 'KPI và cảnh báo', Icon: ChartPieSlice },
  { id: 'analytics', label: 'Analytics', description: 'Traffic và chuyển đổi', Icon: Pulse },
  { id: 'revenue', label: 'Doanh thu', description: 'PayOS và dự phóng', Icon: CurrencyCircleDollar },
  { id: 'pricing', label: 'Giá & Sale', description: 'Hi Pro và Hi Max', Icon: Tag },
  { id: 'users', label: 'Người dùng', description: 'Tài khoản và quyền', Icon: Users },
  { id: 'videos', label: 'Video sức khỏe', description: 'Nội dung đã duyệt', Icon: VideoCamera },
  { id: 'questions', label: 'Câu hỏi mỗi ngày', description: 'Kho câu hỏi cặp đôi', Icon: Question },
  { id: 'affiliate', label: 'Affiliate', description: 'TikTok và Shopee', Icon: Storefront },
  { id: 'notifications', label: 'Thông báo', description: 'Chiến dịch vận hành', Icon: BellRinging },
  { id: 'system', label: 'Hệ thống', description: 'Health và cấu hình', Icon: Cpu },
] as const;

const VALID_TABS = new Set<AdminTab>(NAV_ITEMS.map((item) => item.id));

function ActivePanel({ tab }: { tab: AdminTab }) {
  switch (tab) {
    case 'analytics':
      return <AdminAnalyticsPanel />;
    case 'revenue':
      return <AdminRevenuePanel />;
    case 'pricing':
      return <AdminPricingPanel />;
    case 'users':
      return <AdminUsersPanel />;
    case 'videos':
      return <HealthVideoAdminPanel />;
    case 'questions':
      return <AdminDailyQuestionsPanel />;
    case 'affiliate':
      return <AffiliateAdminPanel />;
    case 'notifications':
      return <AdminNotificationsPanel />;
    case 'system':
      return <AdminSystemPanel />;
    default:
      return <AdminOverviewPanel />;
  }
}

export default function AdminPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const requestedTab = searchParams.get('tab') as AdminTab | null;
  const activeTab = requestedTab && VALID_TABS.has(requestedTab) ? requestedTab : 'overview';
  const activeItem = useMemo(
    () => NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0],
    [activeTab]
  );

  const selectTab = (tab: AdminTab) => {
    setSearchParams(tab === 'overview' ? {} : { tab });
    setMobileNavOpen(false);
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative flex min-h-[100dvh] bg-slate-50 font-sans text-slate-800">
      <PageBackdrop variant="admin" />

      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Đóng điều hướng"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <HiLogo size={36} />
            <div>
              <p
                className="text-sm font-extrabold"
                style={{
                  background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Hi Admin
              </p>
              <p className="text-xs text-slate-500">Bảng vận hành nội bộ</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng menu"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Điều hướng quản trị">
          {NAV_ITEMS.map((item) => {
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:scale-[0.99] ${
                  active
                    ? 'bg-rose-50 text-[#c52d62]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <item.Icon size={18} weight={active ? 'fill' : 'regular'} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{item.label}</span>
                  <span className={`block truncate text-[11px] ${active ? 'text-rose-500' : 'text-slate-400'}`}>
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 active:scale-[0.98]"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="relative z-10 min-w-0 flex-1">
        {!mobileNavOpen && (
          <button
            type="button"
            aria-label="Mở điều hướng"
            className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition-all hover:bg-rose-600 hover:scale-105 active:scale-95 lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <List size={24} />
          </button>
        )}

        <main className="mx-auto w-full max-w-[1500px] p-4 md:p-6 lg:p-8">
          <Suspense fallback={<AdminPanelSkeleton />}>
            <ActivePanel tab={activeTab} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

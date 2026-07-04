import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapTrifold } from '@phosphor-icons/react';
import { useAuthStore } from '../../store/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import api from '../../lib/api';
import HiLogo from '../ui/HiLogo';
import PlanStatusPill from '../ui/PlanStatusPill';

interface NavbarProps {
  /** Show landing-page anchor links. Only visible when not logged in. */
  showAnchors?: boolean;
}

export default function Navbar({ showAnchors = false }: NavbarProps) {
  const { token, user, logout, setUser } = useAuthStore();
  const { data: subscription } = useSubscription();
  const location = useLocation();
  const loggedIn = !!token;
  const isAdmin = user?.role === 'admin';
  const homePath = isAdmin ? '/admin' : user?.gender === 'female' ? '/female-dashboard' : '/male-dashboard';
  const notificationSettingsPath = user?.gender === 'female'
    ? '/settings/notifications'
    : '/male-settings/notifications';

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data as { success: boolean; unreadCount: number }),
    enabled: !!token,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;

  useQuery({
    queryKey: ['profile-connection-poll', user?._id],
    queryFn: async () => {
      const { data } = await api.get('/users/profile');
      const nextUser = data?.user ?? data?.data?.user;
      if (nextUser && nextUser.partnerId !== user?.partnerId) {
        setUser(nextUser);
      }
      return nextUser;
    },
    enabled: loggedIn && !isAdmin,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const dashboardLinks = isAdmin
    ? [{ to: '/admin', label: 'Quản trị', icon: 'verified_user' }]
    : user?.gender === 'female'
      ? [
          { to: '/female-dashboard', label: 'Tổng quan', icon: 'bar_chart' },
          { to: '/cycles', label: 'Chu kỳ', icon: 'calendar_month' },
          { to: '/partner', label: 'Người ấy', icon: 'favorite' },
          { to: '/couple-map', label: 'Bản đồ', icon: 'map' },
          { to: '/products', label: 'Sản phẩm', icon: 'shopping_bag' },
          { to: notificationSettingsPath, label: 'Cài đặt thông báo', icon: 'notifications_active' },
        ]
      : [
          { to: '/male-dashboard', label: 'Tổng quan', icon: 'bar_chart' },
          { to: '/partner', label: 'Người ấy', icon: 'favorite' },
          { to: '/couple-map', label: 'Bản đồ', icon: 'map' },
          { to: '/products', label: 'Sản phẩm', icon: 'shopping_bag' },
          { to: notificationSettingsPath, label: 'Cài đặt thông báo', icon: 'notifications_active' },
        ];

  const menuItems = isAdmin
    ? [
        { to: '/admin', icon: 'verified_user', label: 'Quản trị hệ thống' },
        { to: '/settings', icon: 'manage_accounts', label: 'Hồ sơ cá nhân' },
      ]
    : [
        { to: user?.gender === 'female' ? '/female-dashboard' : '/male-dashboard', icon: 'bar_chart', label: 'Tổng quan' },
        { to: '/partner', icon: 'favorite', label: 'Người ấy' },
        { to: '/couple-map', icon: 'map', label: 'Bản đồ hẹn hò' },
        { to: '/products', icon: 'shopping_bag', label: 'Sản phẩm chăm sóc' },
        { to: notificationSettingsPath, icon: 'notifications_active', label: 'Cài đặt thông báo' },
        { to: '/settings', icon: 'manage_accounts', label: 'Hồ sơ cá nhân' },
        { to: user?.gender === 'female' ? '/cycles' : '/calendar', icon: 'calendar_month', label: user?.gender === 'female' ? 'Chu kỳ của tôi' : 'Lịch của bạn' },
      ].filter((item) => user?.gender === 'female' || item.to !== '/calendar');

  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    setDropOpen(false);
  }, [location.pathname]);

  const isCoupleMap = location.pathname === '/couple-map';

  return (
    <div className={`${isCoupleMap ? 'absolute' : 'sticky'} top-4 z-50 flex w-full justify-center px-4`}>
      <header className="lp-floating-nav flex w-full max-w-[1100px] items-center justify-between whitespace-nowrap rounded-full px-6 py-3">
        <Link to={loggedIn ? homePath : '/'} className="flex flex-shrink-0 items-center gap-3">
          <HiLogo size={34} />
          <span
            className="text-lg font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Hi Lover
          </span>
        </Link>

        {loggedIn ? (
          <nav className="mx-3 hidden flex-1 items-center justify-center gap-1 md:flex">
            {dashboardLinks.map(({ to, label, icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    active ? 'bg-white/80 text-pink-500 shadow-sm' : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
                  }`}
                >
                  {icon === 'map' ? (
                    <MapTrifold size={18} weight={active ? 'fill' : 'bold'} />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  )}
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : showAnchors ? (
          <div className="hidden flex-1 justify-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-500 transition-colors hover:text-purple-400">Tính năng</a>
            <a href="#pricing" className="text-sm font-medium text-slate-500 transition-colors hover:text-purple-400">Gói Đồng Hành</a>
            <a href="#about" className="text-sm font-medium text-slate-500 transition-colors hover:text-purple-400">Về chúng tôi</a>
            <a href="#reviews" className="text-sm font-medium text-slate-500 transition-colors hover:text-purple-400">Blog</a>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {loggedIn ? (
            <>
              <PlanStatusPill subscription={subscription} compact className="hidden sm:inline-flex" />
              <Link
                to="/notifications"
                aria-label="Thông báo"
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-white text-slate-500 shadow-sm transition-all hover:border-pink-200 hover:text-pink-500"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-red-500" />
                )}
              </Link>

              <div className="relative" ref={dropRef}>
                <button
                  type="button"
                  onClick={() => setDropOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-gray-100 bg-white py-1 pl-1 pr-3 transition-all hover:shadow-sm"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-300 to-purple-300">
                    <span className="material-symbols-outlined text-[16px] text-white">person</span>
                  </div>
                  <span className="hidden text-sm font-bold text-slate-900 sm:block">{user?.name?.split(' ').pop()}</span>
                  <span className={`material-symbols-outlined text-lg text-slate-400 transition-transform duration-200 ${dropOpen ? 'rotate-90' : ''}`}>
                    chevron_right
                  </span>
                </button>

                {dropOpen && (
                  <div className="animate-fade-in absolute right-0 z-50 mt-3 w-56 rounded-2xl border border-gray-100 bg-white py-2 shadow-xl">
                    <div className="border-b border-gray-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="max-w-[110px] truncate text-sm font-bold text-slate-900">{user?.name}</p>
                        <PlanStatusPill subscription={subscription} compact />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">{user?.email}</p>
                    </div>

                    {menuItems.map(({ to, icon, label }) => (
                      <Link
                        key={`${to}-${label}`}
                        to={to}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-pink-50 hover:text-pink-600"
                      >
                        {icon === 'map' ? (
                          <MapTrifold size={18} weight="bold" className="text-slate-400" />
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-slate-400">{icon}</span>
                        )}
                        {label}
                      </Link>
                    ))}

                    <div className="mt-1 border-t border-gray-50 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDropOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="lp-btn-white hidden h-9 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-bold text-slate-900 sm:flex">
                Đăng nhập
              </Link>
              <Link to="/register" className="lp-btn-gradient flex h-9 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-bold text-white shadow-md">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </header>
    </div>
  );
}

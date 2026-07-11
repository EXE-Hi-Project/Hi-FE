import { ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import MaintenancePage, { MaintenanceStatus } from './MaintenancePage';

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, isBootstrapping } = useAuthStore();
  const maintenanceQuery = useQuery({
    queryKey: ['system-maintenance'],
    queryFn: () => api.get('/system/maintenance').then(({ data }) => data.data as MaintenanceStatus),
    enabled: !isBootstrapping,
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const refresh = () => maintenanceQuery.refetch();
    window.addEventListener('hi:maintenance-active', refresh);
    return () => window.removeEventListener('hi:maintenance-active', refresh);
  }, [maintenanceQuery]);

  if (isBootstrapping || maintenanceQuery.isLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-pink-50/40"><div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-100 border-t-pink-500" /></div>;
  }

  const status = maintenanceQuery.data;
  const isAdmin = user?.role === 'admin';
  const adminLoginRequested = location.pathname === '/login' && new URLSearchParams(location.search).get('maintenance') === '1';
  if (!maintenanceQuery.isError && status?.active && !isAdmin && !adminLoginRequested) {
    return <MaintenancePage status={status} />;
  }
  return <>{children}</>;
}

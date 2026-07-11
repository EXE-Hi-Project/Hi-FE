import { ArrowClockwise, CheckCircle, Gear, WarningCircle, XCircle } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../lib/api';
import AdminPanelSkeleton from './AdminPanelSkeleton';
import AdminMaintenancePanel from './AdminMaintenancePanel';

type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'NOT_CONFIGURED';

interface SystemHealth {
  overallStatus: HealthStatus;
  checkedAt: string;
  services: Array<{
    name: string;
    status: HealthStatus;
    message: string;
    latencyMs?: number;
  }>;
}

const STATUS_STYLES: Record<HealthStatus, string> = {
  HEALTHY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DEGRADED: 'bg-amber-50 text-amber-700 border-amber-200',
  UNAVAILABLE: 'bg-rose-50 text-rose-700 border-rose-200',
  NOT_CONFIGURED: 'bg-slate-100 text-slate-600 border-slate-200',
};

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === 'HEALTHY') return <CheckCircle size={20} weight="fill" />;
  if (status === 'UNAVAILABLE') return <XCircle size={20} weight="fill" />;
  if (status === 'NOT_CONFIGURED') return <Gear size={20} weight="fill" />;
  return <WarningCircle size={20} weight="fill" />;
}

export default function AdminSystemPanel() {
  const healthQuery = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => api.get('/admin/system-health').then(({ data }) => data.data as SystemHealth),
    refetchInterval: 60_000,
  });

  if (healthQuery.isLoading) return <AdminPanelSkeleton />;
  if (healthQuery.isError || !healthQuery.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <XCircle size={28} className="mx-auto text-rose-500" />
        <p className="mt-3 font-bold text-slate-900">Không thể kiểm tra trạng thái hệ thống</p>
        <button type="button" onClick={() => healthQuery.refetch()} className="mt-4 text-sm font-bold text-rose-600">
          Thử lại
        </button>
      </div>
    );
  }

  const health = healthQuery.data;
  const statusChart = (['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'NOT_CONFIGURED'] as HealthStatus[])
    .map((status) => ({
      status,
      count: health.services.filter((service) => service.status === status).length,
      color: status === 'HEALTHY' ? '#10b981' : status === 'DEGRADED' ? '#f59e0b' : status === 'UNAVAILABLE' ? '#ef4444' : '#94a3b8',
    }));
  return (
    <div className="space-y-6">
      <AdminMaintenancePanel />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Trạng thái hệ thống</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kiểm tra kết nối và cấu hình, không gọi model AI hoặc API affiliate có tính phí.
          </p>
        </div>
        <button
          type="button"
          onClick={() => healthQuery.refetch()}
          disabled={healthQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <ArrowClockwise size={16} className={healthQuery.isFetching ? 'animate-spin' : ''} />
          Kiểm tra lại
        </button>
      </div>

      <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold ${STATUS_STYLES[health.overallStatus]}`}>
        <StatusIcon status={health.overallStatus} />
        Toàn hệ thống: {health.overallStatus}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-950">Health distribution</h3>
            <p className="mt-1 text-xs text-slate-500">Ảnh chụp trạng thái hiện tại, không phải uptime lịch sử.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{health.services.length} services</span>
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusChart} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {statusChart.map((item) => <Cell key={item.status} fill={item.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {health.services.map((service) => (
          <article key={service.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-950">{service.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{service.message}</p>
              </div>
              <span className={`rounded-lg border p-2 ${STATUS_STYLES[service.status]}`}>
                <StatusIcon status={service.status} />
              </span>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className={`font-bold ${STATUS_STYLES[service.status].split(' ')[1]}`}>{service.status}</span>
              <span className="text-slate-400">{service.latencyMs != null ? `${service.latencyMs} ms` : 'Không gọi từ xa'}</span>
            </div>
          </article>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Lần kiểm tra: {new Date(health.checkedAt).toLocaleString('vi-VN')}
      </p>
    </div>
  );
}

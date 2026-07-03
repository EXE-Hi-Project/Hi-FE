import {
  BellRinging,
  ChatCircleDots,
  Heartbeat,
  Storefront,
  Users,
  WarningCircle,
} from '@phosphor-icons/react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import AdminPanelSkeleton from './AdminPanelSkeleton';
import useAdminOverview from './useAdminOverview';

export default function AdminOverviewPanel() {
  const navigate = useNavigate();
  const overviewQuery = useAdminOverview();

  if (overviewQuery.isLoading) return <AdminPanelSkeleton />;
  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <WarningCircle size={28} className="mx-auto text-rose-500" />
        <p className="mt-3 font-bold text-slate-900">Không thể tải tổng quan quản trị</p>
        <button type="button" onClick={() => overviewQuery.refetch()} className="mt-4 text-sm font-bold text-rose-600">
          Thử lại
        </button>
      </div>
    );
  }

  const { overview, recentUsers, payosReport, affiliateReport, monthlyFinancials } = overviewQuery.data;
  const userMix = [
    { name: 'Nữ', value: overview.usersFemale, color: '#eb477e' },
    { name: 'Nam', value: overview.usersMale, color: '#3b82f6' },
    { name: 'Khác', value: Math.max(overview.usersTotal - overview.usersFemale - overview.usersMale, 0), color: '#94a3b8' },
  ].filter((item) => item.value > 0);
  const dataMix = [
    { label: 'Chu kỳ', value: overview.cyclesTotal, color: '#f472b6' },
    { label: 'Triệu chứng', value: overview.symptomsTotal, color: '#8b5cf6' },
    { label: 'AI chat', value: overview.chatMessagesTotal, color: '#38bdf8' },
  ];
  const revenueMix = [
    { label: 'PayOS', value: payosReport.totalRevenueVnd ?? 0, color: '#eb477e' },
    { label: 'Affiliate', value: affiliateReport?.settledCommissionVnd ?? 0, color: '#10b981' },
  ];
  const metrics = [
    { label: 'Người dùng', value: overview.usersTotal, detail: `${overview.usersFemale} nữ, ${overview.usersMale} nam`, Icon: Users },
    { label: 'Dữ liệu sức khỏe', value: overview.cyclesTotal + overview.symptomsTotal, detail: 'Chu kỳ và triệu chứng', Icon: Heartbeat },
    { label: 'Tin nhắn AI', value: overview.chatMessagesTotal, detail: 'Tổng lịch sử hội thoại', Icon: ChatCircleDots },
    { label: 'Thông báo chưa đọc', value: overview.unreadNotifications, detail: `${overview.notificationsTotal} thông báo đã tạo`, Icon: BellRinging },
  ];

  const actionItems = [
    {
      title: `${payosReport.statusBreakdown.pending} giao dịch đang chờ`,
      description: 'Kiểm tra thanh toán PayOS chưa hoàn tất.',
      tab: 'revenue',
    },
    {
      title: `${overview.unreadNotifications} thông báo chưa đọc`,
      description: 'Theo dõi mức độ tiếp nhận thông báo của người dùng.',
      tab: 'notifications',
    },
    {
      title: `${affiliateReport?.orders ?? 0} đơn affiliate`,
      description: 'Đối soát hoa hồng và sản phẩm đang hoạt động.',
      tab: 'affiliate',
    },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-950">Tình hình vận hành</h2>
        <p className="mt-1 text-sm text-slate-500">Các chỉ số chính và việc cần kiểm tra trong hệ thống.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
              <metric.Icon size={19} className="text-[#d93670]" />
            </div>
            <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">{metric.value.toLocaleString('vi-VN')}</p>
            <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Tỷ lệ user</h3>
          <p className="mt-1 text-xs text-slate-500">Phân bổ giới tính trong hệ thống.</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={userMix} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={4}>
                  {userMix.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString('vi-VN')} user`, 'Số lượng']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {userMix.map((item) => (
              <span key={item.name} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {item.name}: {item.value.toLocaleString('vi-VN')}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Dữ liệu vận hành</h3>
          <p className="mt-1 text-xs text-slate-500">So sánh dữ liệu sức khỏe và lượng chat.</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataMix} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {dataMix.map((item) => <Cell key={item.label} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="min-w-[220px]">
            <h3 className="font-bold text-slate-900">PayOS và Affiliate</h3>
            <p className="mt-1 text-xs text-slate-500">Chỉ hiển thị dữ liệu đã ghi nhận, không tính mô phỏng.</p>
            <div className="mt-4 space-y-2">
              {revenueMix.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-xs font-bold text-slate-600">{item.label}</span>
                  <span className="text-xs font-black text-slate-900">{Math.round(item.value).toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>
          </div>
          <div className="min-h-56 flex-1">
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={monthlyFinancials.slice(-6)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="revenueUsd" name="MRR ước tính USD" fill="#eb477e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="netUsd" name="Net ước tính USD" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Cần chú ý</h3>
            <p className="mt-1 text-xs text-slate-500">Lối tắt tới các khu vực cần vận hành.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {actionItems.map((item) => (
              <button
                key={item.tab}
                type="button"
                onClick={() => navigate(`/admin?tab=${item.tab}`)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Storefront size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                </span>
                <span className="text-sm font-bold text-rose-600">Mở</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Người dùng mới</h3>
            <p className="mt-1 text-xs text-slate-500">5 tài khoản đăng ký gần nhất.</p>
          </div>
          {recentUsers.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Chưa có người dùng mới.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                    {user.gender}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

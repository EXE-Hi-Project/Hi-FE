import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BellRinging, CaretLeft, CaretRight, DownloadSimple, Crown, MagnifyingGlass, ShieldCheck, Trash, Users, EnvelopeSimple } from '@phosphor-icons/react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { getUserFacingError } from '../../lib/userFacingError';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import type { AdminUser, OtpDelivery } from './adminTypes';
import useAdminOverview from './useAdminOverview';

const PAGE_SIZE = 10;

type RoleFilter = 'all' | 'user' | 'admin';
type GenderFilter = 'all' | 'female' | 'male' | 'other';
type PendingAction =
  | { type: 'role'; user: AdminUser; nextRole: 'user' | 'admin' }
  | { type: 'status'; user: AdminUser; nextStatus: 'ACTIVE' | 'LOCKED' }
  | { type: 'delete'; user: AdminUser }
  | null;

export default function AdminUsersPanel() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [reason, setReason] = useState('');
  const [notificationTarget, setNotificationTarget] = useState<AdminUser | null>(null);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [subscriptionTarget, setSubscriptionTarget] = useState<AdminUser | null>(null);
  const [otpHistoryTarget, setOtpHistoryTarget] = useState<AdminUser | null>(null);
  const [subPlan, setSubPlan] = useState<'free' | 'premium'>('premium');
  const [subDurationDays, setSubDurationDays] = useState(30);
  const [subReason, setSubReason] = useState('');
  const overviewQuery = useAdminOverview();

  const usersQueryKey = useMemo(
    () => ['admin-users', { q, roleFilter, genderFilter, page }],
    [q, roleFilter, genderFilter, page]
  );

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      const { data } = await api.get('/admin/users', {
        params: {
          q: q || undefined,
          role: roleFilter === 'all' ? undefined : roleFilter,
          gender: genderFilter === 'all' ? undefined : genderFilter,
          page,
          limit: PAGE_SIZE,
        },
      });
      return data as {
        success: boolean;
        items: AdminUser[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin' }) =>
      api.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò');
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Không thể cập nhật vai trò'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status, reason: nextReason }: { userId: string; status: 'ACTIVE' | 'LOCKED'; reason?: string }) =>
      api.patch(`/admin/users/${userId}/status`, { status, reason: nextReason }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái tài khoản');
      setPendingAction(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Không thể cập nhật trạng thái tài khoản'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      toast.success('Đã xóa vĩnh viễn tài khoản');
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Không thể xóa tài khoản'),
  });

  const sendNotificationMutation = useMutation({
    mutationFn: ({ userId, title, message }: { userId: string; title: string; message: string }) =>
      api.post(`/admin/users/${userId}/notifications`, { title, message, type: 'ADMIN_MESSAGE' }),
    onSuccess: () => {
      toast.success('Đã gửi thông báo');
      setNotificationTarget(null);
      setNotificationTitle('');
      setNotificationMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: () => toast.error('Không thể gửi thông báo'),
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ userId, plan, durationDays, reason: subReasonText }: { userId: string; plan: string; durationDays: number; reason?: string }) =>
      api.patch(`/admin/users/${userId}/subscription`, { plan, durationDays, reason: subReasonText }),
    onSuccess: () => {
      toast.success('Đã cập nhật gói tài khoản');
      setSubscriptionTarget(null);
      setSubReason('');
      setSubDurationDays(30);
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: unknown) => {
      toast.error(getUserFacingError(err, 'Không thể cập nhật gói tài khoản'));
    },
  });
  const otpHistoryQuery = useQuery({
    queryKey: ['admin-user-otp-deliveries', otpHistoryTarget?._id],
    enabled: Boolean(otpHistoryTarget),
    queryFn: async () => {
      const { data } = await api.get(`/admin/users/${otpHistoryTarget?._id}/otp-deliveries`);
      return data.items as OtpDelivery[];
    },
  });

  const exportCsvMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get('/admin/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `users_report_${new Date().toISOString().split('T')[0]}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('Đã xuất CSV'),
    onError: () => toast.error('Xuất CSV thất bại'),
  });

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQ(searchText.trim());
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'role') {
      updateRoleMutation.mutate({ userId: pendingAction.user._id, role: pendingAction.nextRole });
      return;
    }
    if (pendingAction.type === 'status') {
      updateStatusMutation.mutate({
        userId: pendingAction.user._id,
        status: pendingAction.nextStatus,
        reason: pendingAction.nextStatus === 'LOCKED' ? reason.trim() || 'Vi phạm chính sách sử dụng' : undefined,
      });
      return;
    }
    deleteUserMutation.mutate(pendingAction.user._id);
  };

  const users = usersQuery.data?.items ?? [];
  const pagination = usersQuery.data?.pagination;
  const actionLoading = updateRoleMutation.isPending || updateStatusMutation.isPending || deleteUserMutation.isPending;
  const overview = overviewQuery.data?.overview;
  const genderChart = [
    { label: 'Nữ', value: overview?.usersFemale ?? 0, color: '#eb477e' },
    { label: 'Nam', value: overview?.usersMale ?? 0, color: '#3b82f6' },
    { label: 'Khác', value: Math.max((overview?.usersTotal ?? 0) - (overview?.usersFemale ?? 0) - (overview?.usersMale ?? 0), 0), color: '#94a3b8' },
  ].filter((item) => item.value > 0);
  const pageStatusChart = [
    { label: 'Active', value: users.filter((user) => (user.accountStatus ?? 'ACTIVE') === 'ACTIVE').length, color: '#10b981' },
    { label: 'Locked', value: users.filter((user) => user.accountStatus === 'LOCKED').length, color: '#f59e0b' },
    { label: 'Deleted', value: users.filter((user) => user.accountStatus === 'DELETED').length, color: '#ef4444' },
  ].filter((item) => item.value > 0);
  const onboardingChart = [
    { label: 'Hoàn tất', value: users.filter((user) => user.onboardingCompleted).length, color: '#8b5cf6' },
    { label: 'Chưa xong', value: users.filter((user) => !user.onboardingCompleted).length, color: '#cbd5e1' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Giới tính toàn hệ thống" data={genderChart} />
        <ChartCard title="Trạng thái trang hiện tại" data={pageStatusChart} />
        <ChartCard title="Onboarding trang hiện tại" data={onboardingChart} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">Quản lý người dùng</h2>
            <p className="mt-1 text-sm text-slate-500">Tìm kiếm, phân quyền, khóa tài khoản và gửi thông báo cá nhân.</p>
          </div>
          <Button variant="outline" loading={exportCsvMutation.isPending} onClick={() => exportCsvMutation.mutate()}>
            <DownloadSimple size={16} className="mr-2" />
            Xuất CSV
          </Button>
        </div>

        <form onSubmit={onSearch} className="grid gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm tên hoặc email..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => { setPage(1); setRoleFilter(event.target.value as RoleFilter); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 outline-none"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <div className="flex gap-2">
            <select
              value={genderFilter}
              onChange={(event) => { setPage(1); setGenderFilter(event.target.value as GenderFilter); }}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 outline-none"
            >
              <option value="all">Tất cả giới tính</option>
              <option value="female">Nữ</option>
              <option value="male">Nam</option>
              <option value="other">Khác</option>
            </select>
            <Button type="submit">Lọc</Button>
          </div>
        </form>

        <div className="p-5">
          {usersQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
              Không tìm thấy người dùng nào.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              {users.map((user) => {
                const isPremium = !!(user.subscription?.plan && user.subscription.plan.toLowerCase() !== 'free' && user.subscription.status === 'active');
                return (
                  <article key={user._id} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${user.role === 'admin' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                        {user.role === 'admin' ? <ShieldCheck size={18} weight="fill" /> : <Users size={18} weight="fill" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                          <Badge tone={user.role === 'admin' ? 'amber' : 'rose'}>{user.role}</Badge>
                          <Badge>{user.gender === 'female' ? 'Nữ' : user.gender === 'male' ? 'Nam' : 'Khác'}</Badge>
                          <Badge tone={user.accountStatus === 'LOCKED' ? 'amber' : user.accountStatus === 'DELETED' ? 'rose' : 'emerald'}>
                            {user.accountStatus ?? 'ACTIVE'}
                          </Badge>
                          <Badge tone={user.onboardingCompleted ? 'emerald' : 'slate'}>{user.onboardingCompleted ? 'Onboarded' : 'Pending'}</Badge>
                          <OtpDeliveryBadge delivery={user.latestOtpDelivery} />
                          <Badge tone={isPremium ? 'violet' : 'slate'}>
                            {isPremium ? 'Premium 👑' : 'Free'}
                          </Badge>
                          {isPremium && user.subscription?.currentPeriodEnd && (
                            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100">
                              Hạn: {new Date(user.subscription.currentPeriodEnd).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={user.accountStatus === 'DELETED'}
                        onClick={() => {
                          setSubPlan(isPremium ? 'free' : 'premium');
                          setSubDurationDays(30);
                          setSubReason('');
                          setSubscriptionTarget(user);
                        }}
                        className="border-violet-200 text-violet-700 hover:bg-violet-50"
                      >
                        <Crown size={15} className="mr-1" />
                        Gói
                      </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={user.accountStatus === 'DELETED'}
                      onClick={() => {
                        setReason('');
                        setPendingAction({ type: 'status', user, nextStatus: user.accountStatus === 'LOCKED' ? 'ACTIVE' : 'LOCKED' });
                      }}
                    >
                      {user.accountStatus === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={user.accountStatus === 'DELETED'} onClick={() => setNotificationTarget(user)}>
                      <BellRinging size={15} className="mr-1" />
                      Gửi TB
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOtpHistoryTarget(user)}>
                      <EnvelopeSimple size={15} className="mr-1" />
                      OTP
                    </Button>
                    <Button size="sm" variant="danger" disabled={user.accountStatus === 'DELETED'} onClick={() => setPendingAction({ type: 'delete', user })}>
                      <Trash size={15} className="mr-1" />
                      Xóa
                    </Button>
                  </div>
                </article>
              );
            })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-slate-500">
              Trang {pagination?.page ?? 1}/{pagination?.totalPages ?? 1} · {pagination?.total ?? 0} người dùng
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!pagination || pagination.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <CaretLeft size={15} />
              </Button>
              <Button variant="outline" size="sm" disabled={!pagination || pagination.page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>
                <CaretRight size={15} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Modal
        open={otpHistoryTarget !== null}
        onClose={() => setOtpHistoryTarget(null)}
        title="Lịch sử gửi OTP"
        footer={<div className="flex justify-end"><Button variant="ghost" onClick={() => setOtpHistoryTarget(null)}>Đóng</Button></div>}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Người dùng: <span className="font-bold text-slate-900">{otpHistoryTarget?.email}</span></p>
          {otpHistoryQuery.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-slate-100" /> :
            (otpHistoryQuery.data?.length ?? 0) === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">Chưa có dữ liệu Resend.</p> :
              <div className="space-y-2">{otpHistoryQuery.data?.map((delivery) => (
                <div key={delivery.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-800">{delivery.purpose === 'ACTIVATION' ? 'Kích hoạt tài khoản' : 'Đặt lại mật khẩu'}</span><OtpDeliveryBadge delivery={delivery} /></div>
                  <p className="mt-1 text-xs text-slate-500">Gửi: {formatDate(delivery.attemptedAt)} · Cập nhật: {formatDate(delivery.statusUpdatedAt)}</p>
                  {delivery.reason && <p className="mt-1 text-xs text-amber-700">{delivery.reason}</p>}
                </div>
              ))}</div>}
        </div>
      </Modal>

      <Modal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title="Xác nhận thao tác"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPendingAction(null)}>Hủy</Button>
            <Button variant={pendingAction?.type === 'delete' ? 'danger' : 'primary'} loading={actionLoading} onClick={confirmPendingAction}>Xác nhận</Button>
          </div>
        )}
      >
        {pendingAction ? (
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              Bạn đang thao tác với <span className="font-bold text-slate-900">{pendingAction.user.email}</span>.
            </p>
            {pendingAction.type === 'role' && (
              <p>Vai trò mới: <span className="font-bold text-slate-900">{pendingAction.nextRole}</span></p>
            )}
            {pendingAction.type === 'status' && pendingAction.nextStatus === 'LOCKED' && (
              <Input label="Lý do khóa" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Vi phạm chính sách sử dụng" />
            )}
            {pendingAction.type === 'delete' && (
              <p className="rounded-xl bg-rose-50 p-3 text-rose-700">Tài khoản sẽ bị xóa vĩnh viễn khỏi database. Thao tác này không thể hoàn tác.</p>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={notificationTarget !== null}
        onClose={() => setNotificationTarget(null)}
        title="Gửi thông báo cá nhân"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNotificationTarget(null)}>Hủy</Button>
            <Button
              loading={sendNotificationMutation.isPending}
              disabled={!notificationTitle.trim() || !notificationMessage.trim() || !notificationTarget}
              onClick={() => notificationTarget && sendNotificationMutation.mutate({
                userId: notificationTarget._id,
                title: notificationTitle,
                message: notificationMessage,
              })}
            >
              Gửi
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Người nhận: <span className="font-bold text-slate-900">{notificationTarget?.email}</span></p>
          <Input label="Tiêu đề" value={notificationTitle} onChange={(event) => setNotificationTitle(event.target.value)} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">Nội dung</span>
            <textarea
              rows={5}
              value={notificationMessage}
              onChange={(event) => setNotificationMessage(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={subscriptionTarget !== null}
        onClose={() => setSubscriptionTarget(null)}
        title="Cập nhật gói tài khoản"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSubscriptionTarget(null)}>Hủy</Button>
            <Button
              loading={updateSubscriptionMutation.isPending}
              onClick={() => subscriptionTarget && updateSubscriptionMutation.mutate({
                userId: subscriptionTarget._id,
                plan: subPlan,
                durationDays: subDurationDays,
                reason: subReason,
              })}
            >
              Cập nhật
            </Button>
          </div>
        )}
      >
        {subscriptionTarget ? (
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              Cập nhật gói dịch vụ cho <span className="font-bold text-slate-900">{subscriptionTarget.email}</span>.
            </p>
            <div>
              <label className="block mb-1.5 text-sm font-bold text-slate-700">Chọn gói tài khoản</label>
              <select
                value={subPlan}
                onChange={(e) => setSubPlan(e.target.value as 'free' | 'premium')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-rose-400"
              >
                <option value="free">Miễn phí (Free)</option>
                <option value="premium">Premium 👑</option>
              </select>
            </div>

            {subPlan === 'premium' && (
              <>
                <div>
                  <Input
                    label="Thời hạn kích hoạt (ngày)"
                    type="number"
                    min={1}
                    max={366}
                    value={subDurationDays}
                    onChange={(e) => setSubDurationDays(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Lý do nâng cấp"
                    value={subReason}
                    onChange={(e) => setSubReason(e.target.value)}
                    placeholder="Kích hoạt thủ công bởi admin..."
                  />
                </div>
              </>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function ChartCard({ title, data }: { title: string; data: Array<{ label: string; value: number; color: string }> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-950">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400">Chưa có dữ liệu</p>
      ) : (
        <div className="mt-3 grid grid-cols-[130px_minmax(0,1fr)] items-center gap-3">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={32} outerRadius={56} paddingAngle={4}>
                  {data.map((item) => <Cell key={item.label} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => [Number(value).toLocaleString('vi-VN'), 'Số lượng']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-bold text-slate-600">{item.label}</span>
                <span className="text-xs font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'violet' }) {
  const classes = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${classes[tone]}`}>{children}</span>;
}

function OtpDeliveryBadge({ delivery }: { delivery?: OtpDelivery }) {
  if (!delivery) return <Badge>OTP: Chưa có dữ liệu</Badge>;
  const labels: Record<OtpDelivery['status'], string> = { PENDING: 'OTP: Đang gửi', SENT: 'OTP: Đã gửi', DELIVERED: 'OTP: Đã giao', BOUNCED: 'OTP: Bị trả lại', COMPLAINED: 'OTP: Bị khiếu nại', DELAYED: 'OTP: Đang chậm', FAILED: 'OTP: Lỗi gửi' };
  const tone = delivery.status === 'DELIVERED' ? 'emerald' : ['BOUNCED', 'COMPLAINED', 'FAILED'].includes(delivery.status) ? 'rose' : ['DELAYED', 'PENDING'].includes(delivery.status) ? 'amber' : 'violet';
  return <Badge tone={tone}>{labels[delivery.status]}</Badge>;
}

function formatDate(value: string) { return new Date(value).toLocaleString('vi-VN'); }

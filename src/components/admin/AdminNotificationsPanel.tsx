import { useState } from 'react';
import { BellRinging, Users } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

type Audience = 'all' | 'female' | 'male' | 'premium';

export default function AdminNotificationsPanel() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Audience>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const audienceQuery = useQuery({
    queryKey: ['admin-notification-audience', target],
    queryFn: () => api.get('/admin/notifications/audience-count', { params: { target } })
      .then(({ data }) => data.data as { target: Audience; count: number }),
  });
  const audienceBreakdownQuery = useQuery({
    queryKey: ['admin-notification-audience-breakdown'],
    queryFn: async () => {
      const targets: Audience[] = ['all', 'female', 'male', 'premium'];
      const results = await Promise.all(targets.map((item) =>
        api.get('/admin/notifications/audience-count', { params: { target: item } }).then(({ data }) => data.data as { target: Audience; count: number })
      ));
      const labels: Record<Audience, string> = { all: 'Tất cả', female: 'Nữ', male: 'Nam', premium: 'Hi Pro/Max' };
      const colors: Record<Audience, string> = { all: '#64748b', female: '#eb477e', male: '#3b82f6', premium: '#8b5cf6' };
      return results.map((item) => ({ label: labels[item.target], count: item.count, color: colors[item.target] }));
    },
    staleTime: 30_000,
  });

  const campaignMutation = useMutation({
    mutationFn: () => api.post('/admin/notifications/campaigns', {
      target,
      title: title.trim(),
      body: body.trim(),
      actionUrl: actionUrl.trim() || undefined,
    }),
    onSuccess: ({ data }) => {
      toast.success(`Đã gửi tới ${data.data.recipientCount} người dùng`);
      setTitle('');
      setBody('');
      setActionUrl('');
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: () => toast.error('Không thể gửi chiến dịch thông báo'),
  });

  const remindersMutation = useMutation({
    mutationFn: () => api.post('/admin/trigger-reminders'),
    onSuccess: () => toast.success('Đã chạy job nhắc chu kỳ'),
    onError: () => toast.error('Không thể chạy job nhắc chu kỳ'),
  });

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && (audienceQuery.data?.count ?? 0) > 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Tạo chiến dịch thông báo</h2>
          <p className="mt-1 text-sm text-slate-500">Tin sẽ được lưu vào hộp thông báo của từng tài khoản hợp lệ.</p>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">Nhóm đối tượng</span>
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as Audience)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            >
              <option value="all">Tất cả người dùng</option>
              <option value="female">Người dùng nữ</option>
              <option value="male">Người dùng nam</option>
              <option value="premium">Tài khoản Hi Pro / Hi Max</option>
            </select>
          </label>
          <Input label="Tiêu đề" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">Nội dung</span>
            <textarea
              rows={7}
              maxLength={1000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
            <span className="mt-1 block text-right text-xs text-slate-400">{body.length}/1000</span>
          </label>
          <Input
            label="Đường dẫn khi mở thông báo"
            placeholder="/notifications"
            value={actionUrl}
            onChange={(event) => setActionUrl(event.target.value)}
          />
          <Button disabled={!canSubmit} onClick={() => setConfirmOpen(true)}>
            Xem lại và gửi
          </Button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-rose-50 p-2 text-rose-600"><Users size={20} /></span>
            <div>
              <p className="text-sm font-bold text-slate-900">Người nhận dự kiến</p>
              <p className="text-xs text-slate-500">Loại tài khoản khóa, xóa và admin.</p>
            </div>
          </div>
          <p className="mt-6 text-4xl font-extrabold text-slate-950">
            {audienceQuery.isLoading ? '...' : (audienceQuery.data?.count ?? 0).toLocaleString('vi-VN')}
          </p>
          <p className="mt-1 text-sm text-slate-500">tài khoản</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-slate-100 p-2 text-slate-600"><BellRinging size={20} /></span>
            <div>
              <p className="text-sm font-bold text-slate-900">Nhắc chu kỳ</p>
              <p className="text-xs text-slate-500">Chạy job nhắc định kỳ ngay bây giờ.</p>
            </div>
          </div>
          <Button
            variant="outline"
            fullWidth
            className="mt-5"
            loading={remindersMutation.isPending}
            onClick={() => remindersMutation.mutate()}
          >
            Chạy nhắc nhở
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Audience preview</h3>
          <p className="mt-1 text-xs text-slate-500">Số tài khoản hợp lệ theo nhóm nhận.</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={audienceBreakdownQuery.data ?? []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {(audienceBreakdownQuery.data ?? []).map((item) => <Cell key={item.label} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </aside>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Xác nhận gửi chiến dịch"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Hủy</Button>
            <Button loading={campaignMutation.isPending} onClick={() => campaignMutation.mutate()}>Gửi thông báo</Button>
          </div>
        )}
      >
        <div className="space-y-3 text-sm">
          <p><span className="font-bold text-slate-900">Người nhận:</span> {audienceQuery.data?.count ?? 0} tài khoản</p>
          <p><span className="font-bold text-slate-900">Tiêu đề:</span> {title}</p>
          <div className="rounded-xl bg-slate-50 p-3 text-slate-600">{body}</div>
        </div>
      </Modal>
    </div>
  );
}

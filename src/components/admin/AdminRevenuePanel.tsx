import { useMemo, useState } from 'react';
import { CurrencyCircleDollar, Receipt, TrendUp, WarningCircle, Trash, Plus } from '@phosphor-icons/react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import AdminPanelSkeleton from './AdminPanelSkeleton';
import useAdminOverview from './useAdminOverview';

interface AiCostLog {
  id?: string;
  month: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  notes?: string;
  createdAt?: string;
}

type Period = 'today' | 'week' | 'month' | 'year' | 'all';

function vnd(value?: number) {
  return `${Math.round(value ?? 0).toLocaleString('vi-VN')} đ`;
}

export default function AdminRevenuePanel() {
  const queryClient = useQueryClient();
  const overviewQuery = useAdminOverview();
  const [period, setPeriod] = useState<Period>('year');
  const [paidRateOverride, setPaidRateOverride] = useState<number | null>(null);
  const [arpuOverride, setArpuOverride] = useState<number | null>(null);

  const [aiForm, setAiForm] = useState({
    month: new Date().toISOString().substring(0, 7),
    inputTokens: '',
    outputTokens: '',
    costUsd: '',
    notes: '',
  });

  const aiCostsQuery = useQuery({
    queryKey: ['admin-ai-costs'],
    queryFn: () => api.get('/admin/ai-costs').then(({ data }) => data.data as AiCostLog[]),
  });

  const saveAiCost = useMutation({
    mutationFn: (payload: any) => api.post('/admin/ai-costs', payload),
    onSuccess: () => {
      toast.success('Đã ghi nhận chi phí AI');
      setAiForm({
        month: new Date().toISOString().substring(0, 7),
        inputTokens: '',
        outputTokens: '',
        costUsd: '',
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-ai-costs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: () => toast.error('Không thể lưu ghi nhận chi phí AI'),
  });

  const deleteAiCost = useMutation({
    mutationFn: (month: string) => api.delete(`/admin/ai-costs/${month}`),
    onSuccess: () => {
      toast.success('Đã xóa ghi nhận chi phí AI');
      queryClient.invalidateQueries({ queryKey: ['admin-ai-costs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: () => toast.error('Không thể xóa ghi nhận chi phí AI'),
  });

  const report = overviewQuery.data;
  const filteredTransactions = useMemo(() => {
    const transactions = report?.payosReport.transactions ?? [];
    if (period === 'all') return transactions;
    const now = new Date();
    const start = new Date(now);
    if (period === 'today') start.setHours(0, 0, 0, 0);
    if (period === 'week') start.setDate(now.getDate() - 7);
    if (period === 'month') start.setDate(now.getDate() - 30);
    if (period === 'year') start.setMonth(0, 1), start.setHours(0, 0, 0, 0);
    return transactions.filter((transaction) => new Date(transaction.createdAt) >= start);
  }, [period, report?.payosReport.transactions]);

  if (overviewQuery.isLoading) return <AdminPanelSkeleton />;
  if (overviewQuery.isError || !report) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <WarningCircle size={28} className="mx-auto text-rose-500" />
        <p className="mt-3 font-bold text-slate-900">Không thể tải báo cáo doanh thu</p>
      </div>
    );
  }

  const actualRevenue = filteredTransactions
    .filter((transaction) => transaction.status.toLowerCase() === 'completed')
    .reduce((sum, transaction) => sum + (transaction.amount ?? 0), 0);
  const completedOrders = filteredTransactions.filter((transaction) => transaction.status.toLowerCase() === 'completed').length;
  const paidRate = paidRateOverride ?? report.financialReport.assumptions.paidUserRate;
  const arpu = arpuOverride ?? report.financialReport.arpuUsd;
  const projectedPaidUsers = Math.round(report.overview.usersTotal * paidRate / 100);
  const projectedMrr = projectedPaidUsers * arpu;
  const projectedProfit = projectedMrr
    - report.financialReport.estimatedAiCostMonthlyUsd
    - report.financialReport.infraCostUsd;
  const revenueTrend = filteredTransactions.reduce<Array<{ date: string; revenue: number; orders: number }>>((items, transaction) => {
    const date = new Date(transaction.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    let item = items.find((entry) => entry.date === date);
    if (!item) {
      item = { date, revenue: 0, orders: 0 };
      items.push(item);
    }
    if (transaction.status.toLowerCase() === 'completed') {
      item.revenue += transaction.amount ?? 0;
      item.orders += 1;
    }
    return items;
  }, []);
  const projectionData = report.monthlyFinancials.slice(-6).map((item) => ({
    month: item.month,
    revenue: item.revenueUsd,
    aiCost: item.aiCostUsd,
    net: item.netUsd,
    isActual: item.isActual,
    actualTokens: item.actualTokens,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Doanh thu thực tế</h2>
          <p className="mt-1 text-sm text-slate-500">PayOS và affiliate được tách khỏi phần dự phóng.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {([
            ['today', 'Hôm nay'],
            ['week', '7 ngày'],
            ['month', '30 ngày'],
            ['year', 'Năm nay'],
            ['all', 'Tất cả'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                period === value ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'PayOS đã thu', value: vnd(actualRevenue), Icon: CurrencyCircleDollar },
          { label: 'Đơn thành công', value: completedOrders.toLocaleString('vi-VN'), Icon: Receipt },
          { label: 'Hoa hồng đã chốt', value: vnd(report.affiliateReport?.settledCommissionVnd), Icon: TrendUp },
        ].map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <p className="text-sm font-semibold">{metric.label}</p>
              <metric.Icon size={19} className="text-rose-600" />
            </div>
            <p className="mt-5 text-2xl font-extrabold text-slate-950">{metric.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Doanh thu PayOS theo thời gian</h3>
          <p className="mt-1 text-xs text-slate-500">Chỉ tính giao dịch completed trong khoảng đang chọn.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eb477e" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#eb477e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={(value) => [vnd(Number(value)), 'Doanh thu']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#eb477e" strokeWidth={2.5} fill="url(#adminRevenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Dự phóng MRR và chi phí</h3>
          <p className="mt-1 text-xs text-slate-500">Mô phỏng nội bộ, không trộn với doanh thu đã thu.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
                  formatter={(value, name, props) => {
                    const payload = props.payload;
                    if (name === 'MRR USD') return [`$${value}`, name];
                    if (name === 'AI cost USD') {
                      const suffix = payload.isActual ? ' (Thực tế)' : ' (Dự kiến)';
                      const tokens = payload.actualTokens ? ` · ${(payload.actualTokens / 1_000_000).toFixed(2)}M tokens` : '';
                      return [`$${value}${suffix}${tokens}`, name];
                    }
                    if (name === 'Net USD') return [`$${value}`, name];
                    return [value, name];
                  }}
                />
                <Bar dataKey="revenue" name="MRR USD" fill="#eb477e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="aiCost" name="AI cost USD" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                  {projectionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isActual ? '#10b981' : '#f59e0b'}
                      stroke={entry.isActual ? '#047857' : '#d97706'}
                      strokeWidth={entry.isActual ? 1 : 0}
                    />
                  ))}
                </Bar>
                <Bar dataKey="net" name="Net USD" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Giao dịch gần đây</h3>
            <p className="mt-1 text-xs text-slate-500">Dữ liệu thật được ghi nhận từ PayOS.</p>
          </div>
          {filteredTransactions.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-400">Không có giao dịch trong khoảng đã chọn.</p>
          ) : (
            <div className="max-h-[460px] divide-y divide-slate-100 overflow-y-auto">
              {filteredTransactions.map((transaction) => (
                <div key={transaction._id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{transaction.userEmail}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      #{transaction.orderCode} · {new Date(transaction.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900">{vnd(transaction.amount)}</p>
                    <p className={`text-[10px] font-bold uppercase ${
                      transaction.status.toLowerCase() === 'completed' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Đây là mô phỏng nội bộ, không phải doanh thu đã thu.
          </div>
          <h3 className="mt-5 font-bold text-slate-900">Dự phóng tài chính</h3>
          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Tỷ lệ chuyển đổi trả phí</span>
                <span>{paidRate}%</span>
              </span>
              <input
                type="range"
                min="1"
                max="100"
                value={paidRate}
                onChange={(event) => setPaidRateOverride(Number(event.target.value))}
                className="mt-2 w-full accent-rose-600"
              />
            </label>
            <label className="block">
              <span className="flex justify-between text-xs font-semibold text-slate-600">
                <span>ARPU (USD/tháng)</span>
                <span>${arpu.toFixed(2)}</span>
              </span>
              <input
                type="range"
                min="0.99"
                max="49.99"
                step="1"
                value={arpu}
                onChange={(event) => setArpuOverride(Number(event.target.value))}
                className="mt-2 w-full accent-rose-600"
              />
            </label>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Hi Pro/Max ước tính</dt><dd className="font-bold">{projectedPaidUsers} người</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">MRR ước tính</dt><dd className="font-bold">${projectedMrr.toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Chi phí AI ước tính</dt><dd className="font-bold">${report.financialReport.estimatedAiCostMonthlyUsd.toFixed(2)}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-3"><dt className="text-slate-700">Lợi nhuận gộp ước tính</dt><dd className="font-extrabold">${projectedProfit.toFixed(2)}</dd></div>
          </dl>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-fadeIn">
          <h3 className="font-bold text-slate-900">Ghi nhận chi phí AI</h3>
          <p className="mt-1 text-xs text-slate-500">Lưu lượng token tiêu hao và chi phí thanh toán API AI thực tế.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!aiForm.month || !aiForm.costUsd) {
                toast.error('Vui lòng chọn tháng và nhập chi phí USD');
                return;
              }
              saveAiCost.mutate({
                month: aiForm.month,
                inputTokens: aiForm.inputTokens ? Number(aiForm.inputTokens) : 0,
                outputTokens: aiForm.outputTokens ? Number(aiForm.outputTokens) : 0,
                costUsd: Number(aiForm.costUsd),
                notes: aiForm.notes,
              });
            }}
            className="mt-4 space-y-3.5"
          >
            <Input
              label="Tháng báo cáo"
              type="month"
              value={aiForm.month}
              onChange={(e) => setAiForm({ ...aiForm, month: e.target.value })}
            />
            <div className="grid gap-3 grid-cols-2">
              <Input
                label="Prompt Tokens"
                type="number"
                value={aiForm.inputTokens}
                onChange={(e) => setAiForm({ ...aiForm, inputTokens: e.target.value })}
                placeholder="Ví dụ: 120000"
              />
              <Input
                label="Completion Tokens"
                type="number"
                value={aiForm.outputTokens}
                onChange={(e) => setAiForm({ ...aiForm, outputTokens: e.target.value })}
                placeholder="Ví dụ: 150000"
              />
            </div>
            <Input
              label="Chi phí thực tế (USD)"
              type="number"
              step="0.01"
              value={aiForm.costUsd}
              onChange={(e) => setAiForm({ ...aiForm, costUsd: e.target.value })}
              placeholder="Ví dụ: 4.50"
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Ghi chú thêm</span>
              <textarea
                value={aiForm.notes}
                onChange={(e) => setAiForm({ ...aiForm, notes: e.target.value })}
                placeholder="Ghi chú nhà cung cấp, tỷ giá,..."
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                rows={2}
              />
            </label>
            <Button type="submit" fullWidth loading={saveAiCost.isPending}>
              <Plus size={14} className="mr-1.5" /> Ghi nhận chi phí
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Nhật ký chi phí AI thực tế</h3>
          <p className="mt-1 text-xs text-slate-500">Các tháng có chi phí thực tế sẽ tự động ghi đè lên các số liệu ước tính.</p>
          <div className="mt-4 overflow-x-auto">
            {aiCostsQuery.isLoading ? (
              <p className="text-sm text-slate-400 py-4">Đang tải nhật ký...</p>
            ) : !aiCostsQuery.data || aiCostsQuery.data.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded-xl">
                Chưa ghi nhận chi phí AI thực tế nào. Hệ thống đang sử dụng công thức dự phóng.
              </p>
            ) : (
              <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-2.5">Tháng</th>
                    <th className="py-2.5">Prompt Tokens</th>
                    <th className="py-2.5">Completion Tokens</th>
                    <th className="py-2.5">Tổng Tiêu Thụ</th>
                    <th className="py-2.5">Chi phí USD</th>
                    <th className="py-2.5">Ghi chú</th>
                    <th className="py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aiCostsQuery.data.map((log) => (
                    <tr key={log.month} className="hover:bg-slate-50/60">
                      <td className="py-3 font-extrabold text-slate-950">{log.month}</td>
                      <td className="py-3">{(log.inputTokens ?? 0).toLocaleString('vi-VN')}</td>
                      <td className="py-3">{(log.outputTokens ?? 0).toLocaleString('vi-VN')}</td>
                      <td className="py-3 font-bold text-slate-800">{(log.totalTokens ?? 0).toLocaleString('vi-VN')}</td>
                      <td className="py-3 font-black text-emerald-600">${log.costUsd?.toFixed(2)}</td>
                      <td className="py-3 truncate max-w-40 text-slate-500" title={log.notes}>{log.notes || '—'}</td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="danger"
                          loading={deleteAiCost.isPending && deleteAiCost.variables === log.month}
                          onClick={() => {
                            if (window.confirm(`Bạn muốn xóa ghi nhận chi phí AI cho tháng ${log.month}?`)) {
                              deleteAiCost.mutate(log.month);
                            }
                          }}
                        >
                          <Trash size={12} className="mr-1" /> Xóa
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

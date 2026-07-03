import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarBlank, CheckCircle, Clock, PencilSimple, Tag } from '@phosphor-icons/react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { formatPlanPrice, type SaleCampaignView } from '../../hooks/usePlanPricing';

interface AdminPricing {
  hiProBasePrice: number;
  hiMaxBasePrice: number;
}

const priceSchema = z.object({
  hiProBasePrice: z.coerce.number().int().min(1000),
  hiMaxBasePrice: z.coerce.number().int().min(1000),
});

const saleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(100),
  subtitle: z.string().trim().max(180),
  hiProSalePrice: z.coerce.number().int().min(0),
  hiMaxSalePrice: z.coerce.number().int().min(0),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
}).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
  message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
  path: ['endsAt'],
});

type PriceForm = z.infer<typeof priceSchema>;
type SaleForm = z.infer<typeof saleSchema>;

function dateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusLabel(status: SaleCampaignView['status']) {
  return { DRAFT: 'Bản nháp', SCHEDULED: 'Đã lên lịch', ACTIVE: 'Đang chạy', ENDED: 'Đã kết thúc', DISABLED: 'Đã tắt' }[status];
}

export default function AdminPricingPanel() {
  const queryClient = useQueryClient();
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const pricingQuery = useQuery<AdminPricing>({
    queryKey: ['admin-plan-pricing'],
    queryFn: () => api.get('/admin/plans/pricing').then(({ data }) => data.data as AdminPricing),
  });
  const salesQuery = useQuery<SaleCampaignView[]>({
    queryKey: ['admin-sales'],
    queryFn: () => api.get('/admin/sales').then(({ data }) => data.data as SaleCampaignView[]),
  });

  const priceForm = useForm<PriceForm>({
    resolver: zodResolver(priceSchema),
    defaultValues: { hiProBasePrice: 49_000, hiMaxBasePrice: 399_000 },
  });
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
  const saleForm = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      name: '', title: '', subtitle: '', hiProSalePrice: 39_000, hiMaxSalePrice: 299_000,
      startsAt: dateTimeLocal(tomorrow), endsAt: dateTimeLocal(nextWeek),
    },
  });

  useEffect(() => {
    if (pricingQuery.data) priceForm.reset(pricingQuery.data);
  }, [priceForm, pricingQuery.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-plan-pricing'] });
    queryClient.invalidateQueries({ queryKey: ['admin-sales'] });
    queryClient.invalidateQueries({ queryKey: ['plan-pricing'] });
  };

  const priceMutation = useMutation({
    mutationFn: (values: PriceForm) => api.put('/admin/plans/pricing', values),
    onSuccess: () => { refresh(); toast.success('Đã cập nhật giá gốc'); },
    onError: () => toast.error('Không thể cập nhật giá gốc'),
  });
  const saleMutation = useMutation({
    mutationFn: (values: SaleForm) => {
      const payload = {
        ...values,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
      };
      return editingSaleId ? api.put(`/admin/sales/${editingSaleId}`, payload) : api.post('/admin/sales', payload);
    },
    onSuccess: () => {
      refresh();
      saleForm.reset();
      setEditingSaleId(null);
      toast.success(editingSaleId ? 'Đã cập nhật chiến dịch' : 'Đã tạo bản nháp sale');
    },
    onError: () => toast.error('Không thể lưu chiến dịch sale'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'disable' }) => api.post(`/admin/sales/${id}/${action}`),
    onSuccess: () => { refresh(); toast.success('Đã cập nhật trạng thái chiến dịch'); },
    onError: () => toast.error('Không thể cập nhật chiến dịch'),
  });

  const watchedSale = saleForm.watch();
  const pricing = pricingQuery.data ?? { hiProBasePrice: 49_000, hiMaxBasePrice: 399_000 };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-rose-600">Giá bán và khuyến mãi</p>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-950">Hi Pro · Hi Max</h2>
        <p className="mt-1 text-sm text-slate-500">Giá tại đây là nguồn sự thật được checkout PayOS sử dụng.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={priceForm.handleSubmit((values) => priceMutation.mutate(values))} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">Giá gốc</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(['hiProBasePrice', 'hiMaxBasePrice'] as const).map((field) => (
              <label key={field} className="block">
                <span className="text-xs font-bold text-slate-500">{field === 'hiProBasePrice' ? 'Hi Pro · 30 ngày' : 'Hi Max · 365 ngày'}</span>
                <input type="number" step="1000" {...priceForm.register(field)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-rose-300" />
              </label>
            ))}
          </div>
          <button type="submit" disabled={priceMutation.isPending} className="mt-5 min-h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-60">
            {priceMutation.isPending ? 'Đang lưu...' : 'Lưu giá gốc'}
          </button>
        </form>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { name: 'Hi Pro', base: pricing.hiProBasePrice, sale: Number(watchedSale.hiProSalePrice) || pricing.hiProBasePrice, period: '30 ngày' },
            { name: 'Hi Max', base: pricing.hiMaxBasePrice, sale: Number(watchedSale.hiMaxSalePrice) || pricing.hiMaxBasePrice, period: '365 ngày' },
          ].map((plan) => (
            <article key={plan.name} className="flex min-h-48 flex-col justify-between rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <div>
                <span className="inline-flex rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">Preview</span>
                <h3 className="mt-3 text-xl font-extrabold text-slate-950">{plan.name}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{plan.period}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 line-through">{formatPlanPrice(plan.base)}</p>
                <p className="text-3xl font-black text-rose-600">{formatPlanPrice(plan.sale)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <form onSubmit={saleForm.handleSubmit((values) => saleMutation.mutate(values))} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><Tag size={22} className="text-rose-600" /><h3 className="text-lg font-extrabold text-slate-900">Tạo chiến dịch sale</h3></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block"><span className="text-xs font-bold text-slate-500">Tên nội bộ</span><input {...saleForm.register('name')} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-300" /></label>
          <label className="block"><span className="text-xs font-bold text-slate-500">Tiêu đề hiển thị</span><input {...saleForm.register('title')} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-300" /></label>
          <label className="block"><span className="text-xs font-bold text-slate-500">Mô tả ngắn</span><input {...saleForm.register('subtitle')} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-300" /></label>
          <label className="block"><span className="text-xs font-bold text-slate-500">Giá sale Hi Pro</span><input type="number" step="1000" {...saleForm.register('hiProSalePrice')} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-300" /></label>
          <label className="block"><span className="text-xs font-bold text-slate-500">Giá sale Hi Max</span><input type="number" step="1000" {...saleForm.register('hiMaxSalePrice')} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-300" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label><span className="text-xs font-bold text-slate-500">Bắt đầu</span><input type="datetime-local" {...saleForm.register('startsAt')} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-2 text-xs outline-none" /></label>
            <label><span className="text-xs font-bold text-slate-500">Kết thúc</span><input type="datetime-local" {...saleForm.register('endsAt')} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-2 text-xs outline-none" /></label>
          </div>
        </div>
        {Object.values(saleForm.formState.errors)[0]?.message ? <p className="mt-3 text-xs font-bold text-rose-600">{Object.values(saleForm.formState.errors)[0]?.message}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={saleMutation.isPending} className="min-h-11 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white disabled:opacity-60">{editingSaleId ? 'Lưu thay đổi' : 'Tạo bản nháp'}</button>
          {editingSaleId ? <button type="button" onClick={() => { setEditingSaleId(null); saleForm.reset(); }} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">Hủy chỉnh sửa</button> : null}
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">Lịch sử chiến dịch</h3>
        <div className="mt-4 space-y-3">
          {(salesQuery.data ?? []).map((sale) => (
            <article key={sale.id} className="flex flex-col gap-4 rounded-xl border border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{sale.name}</p><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{statusLabel(sale.status)}</span></div>
                <p className="mt-1 text-sm text-slate-500">{sale.title}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1"><CalendarBlank size={14} />{new Date(sale.startsAt).toLocaleString('vi-VN')}</span><span className="inline-flex items-center gap-1"><Clock size={14} />{new Date(sale.endsAt).toLocaleString('vi-VN')}</span></div>
              </div>
              <div className="flex shrink-0 gap-2">
                {sale.status !== 'ENDED' ? <button type="button" onClick={() => {
                  setEditingSaleId(sale.id);
                  saleForm.reset({
                    name: sale.name,
                    title: sale.title,
                    subtitle: sale.subtitle,
                    hiProSalePrice: sale.hiProSalePrice,
                    hiMaxSalePrice: sale.hiMaxSalePrice,
                    startsAt: dateTimeLocal(new Date(sale.startsAt)),
                    endsAt: dateTimeLocal(new Date(sale.endsAt)),
                  });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><PencilSimple size={15} />Sửa</button> : null}
                {sale.status === 'DRAFT' || sale.status === 'DISABLED' ? <button type="button" onClick={() => statusMutation.mutate({ id: sale.id, action: 'activate' })} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700"><CheckCircle size={16} />Kích hoạt</button> : null}
                {sale.status === 'ACTIVE' || sale.status === 'SCHEDULED' ? <button type="button" onClick={() => statusMutation.mutate({ id: sale.id, action: 'disable' })} className="min-h-10 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700">Tắt sale</button> : null}
              </div>
            </article>
          ))}
          {!salesQuery.isLoading && (salesQuery.data?.length ?? 0) === 0 ? <p className="py-8 text-center text-sm text-slate-500">Chưa có chiến dịch sale.</p> : null}
        </div>
      </section>
    </div>
  );
}

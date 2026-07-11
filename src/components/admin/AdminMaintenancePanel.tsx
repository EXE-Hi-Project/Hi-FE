import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarBlank, CheckCircle, ClockCountdown, Power, WarningCircle, Wrench, X } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import api from '../../lib/api';
import { getUserFacingError } from '../../lib/userFacingError';
import Button from '../ui/Button';
import HiLogo from '../ui/HiLogo';
import type { MaintenanceStatus } from '../maintenance/MaintenancePage';
import MaintenanceVisual from '../maintenance/MaintenanceVisual';

const schema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['IMMEDIATE', 'SCHEDULED']),
  title: z.string().trim().min(1, 'Nhập tiêu đề').max(120),
  message: z.string().trim().min(1, 'Nhập thông điệp').max(500),
  startsAt: z.string(),
  endsAt: z.string().min(1, 'Chọn thời gian kết thúc'),
}).superRefine((value, context) => {
  if (!value.enabled) return;
  if (new Date(value.endsAt) <= new Date()) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'Thời gian kết thúc phải ở tương lai' });
  if (value.mode === 'SCHEDULED') {
    if (!value.startsAt) context.addIssue({ code: z.ZodIssueCode.custom, path: ['startsAt'], message: 'Chọn thời gian bắt đầu' });
    else if (new Date(value.startsAt) <= new Date()) context.addIssue({ code: z.ZodIssueCode.custom, path: ['startsAt'], message: 'Thời gian bắt đầu phải ở tương lai' });
    else if (new Date(value.startsAt) >= new Date(value.endsAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'Kết thúc phải sau bắt đầu' });
  }
});

type FormValues = z.infer<typeof schema>;

function localDateTime(value?: string | null, fallback = new Date(Date.now() + 2 * 60 * 60 * 1000)) {
  const date = value ? new Date(value) : fallback;
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusText(status?: MaintenanceStatus) {
  if (!status?.enabled) return 'Đang tắt';
  if (status.active) return 'Đang bảo trì';
  if (status.scheduled) return 'Đã lên lịch';
  return 'Đã kết thúc';
}

export default function AdminMaintenancePanel() {
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const statusQuery = useQuery({
    queryKey: ['admin-maintenance'],
    queryFn: () => api.get('/admin/maintenance').then(({ data }) => data.data as MaintenanceStatus),
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { enabled: false, mode: 'IMMEDIATE', title: 'Hi đang được chăm sóc', message: 'Chúng mình đang nâng cấp để trải nghiệm của bạn tốt hơn.', startsAt: localDateTime(), endsAt: localDateTime() },
  });

  useEffect(() => {
    const value = statusQuery.data;
    if (!value) return;
    form.reset({
      enabled: value.enabled,
      mode: value.mode,
      title: value.title,
      message: value.message,
      startsAt: localDateTime(value.startsAt, new Date(Date.now() + 15 * 60 * 1000)),
      endsAt: localDateTime(value.endsAt),
    });
  }, [form, statusQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => api.put('/admin/maintenance', {
      ...values,
      startsAt: values.mode === 'SCHEDULED' && values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
      endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
    }).then(({ data }) => data.data as MaintenanceStatus),
    onSuccess: (next) => {
      queryClient.setQueryData(['admin-maintenance'], next);
      queryClient.invalidateQueries({ queryKey: ['system-maintenance'] });
      toast.success(next.active ? 'Đã bật chế độ bảo trì' : next.scheduled ? 'Đã đặt lịch bảo trì' : 'Đã lưu cấu hình bảo trì');
    },
    onError: (error) => toast.error(getUserFacingError(error, 'Không thể lưu cấu hình bảo trì')),
  });
  const disableMutation = useMutation({
    mutationFn: () => api.post('/admin/maintenance/disable').then(({ data }) => data.data as MaintenanceStatus),
    onSuccess: (next) => {
      queryClient.setQueryData(['admin-maintenance'], next);
      queryClient.invalidateQueries({ queryKey: ['system-maintenance'] });
      toast.success('Đã tắt chế độ bảo trì');
    },
    onError: (error) => toast.error(getUserFacingError(error, 'Không thể tắt chế độ bảo trì')),
  });

  const values = form.watch();
  const submit = (values: FormValues) => {
    if (values.enabled && values.mode === 'IMMEDIATE' && !statusQuery.data?.active) {
      setConfirmOpen(true);
      return;
    }
    saveMutation.mutate(values);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-rose-600">Vận hành hệ thống</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-slate-950"><Wrench size={21} weight="fill" className="text-rose-500" /> Chế độ bảo trì</h2>
          <p className="mt-1 text-sm text-slate-500">Chặn toàn bộ user, admin vẫn truy cập bình thường.</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${statusQuery.data?.active ? 'bg-rose-50 text-rose-700' : statusQuery.data?.scheduled ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <CheckCircle size={16} weight="fill" /> {statusText(statusQuery.data)}
        </span>
      </div>

      <form className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]" onSubmit={form.handleSubmit(submit)}>
        <div className="space-y-4">
          {statusQuery.isError ? <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><WarningCircle size={19} weight="fill" className="mt-0.5 shrink-0" /><div><p className="font-black">Không tải được cấu hình maintenance</p><p className="mt-0.5 text-xs font-semibold">{getUserFacingError(statusQuery.error, 'Hãy kiểm tra backend local đã khởi động với code mới.')}</p><button type="button" onClick={() => statusQuery.refetch()} className="mt-2 text-xs font-black underline">Thử lại</button></div></div> : null}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div><p className="text-sm font-black text-slate-800">Bật maintenance</p><p className="mt-0.5 text-xs text-slate-500">Có hiệu lực theo chế độ và lịch bên dưới.</p></div>
            <button type="button" role="switch" aria-checked={values.enabled} onClick={() => form.setValue('enabled', !values.enabled, { shouldDirty: true })} className={`relative h-7 w-12 rounded-full transition-colors ${values.enabled ? 'bg-rose-500' : 'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${values.enabled ? 'translate-x-6' : 'translate-x-1'}`} /></button>
          </div>
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {([['IMMEDIATE', 'Bật ngay'], ['SCHEDULED', 'Đặt lịch']] as const).map(([mode, label]) => <button key={mode} type="button" onClick={() => form.setValue('mode', mode, { shouldDirty: true, shouldValidate: true })} className={`h-10 rounded-lg text-sm font-black transition-colors ${values.mode === mode ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
          </div>
          <label className="block"><span className="text-xs font-bold text-slate-600">Tiêu đề công khai</span><input {...form.register('title')} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-rose-300" /><p className="mt-1 text-xs text-rose-500">{form.formState.errors.title?.message}</p></label>
          <label className="block"><span className="text-xs font-bold text-slate-600">Thông điệp công khai</span><textarea {...form.register('message')} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-rose-300" /><p className="mt-1 text-xs text-rose-500">{form.formState.errors.message?.message}</p></label>
          <div className="grid gap-3 sm:grid-cols-2">
            {values.mode === 'SCHEDULED' ? <label className="block"><span className="text-xs font-bold text-slate-600">Bắt đầu</span><input type="datetime-local" {...form.register('startsAt')} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-rose-300" /><p className="mt-1 text-xs text-rose-500">{form.formState.errors.startsAt?.message}</p></label> : <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-500"><ClockCountdown size={17} className="mb-1 text-rose-500" />Bắt đầu ngay sau khi lưu</div>}
            <label className="block"><span className="text-xs font-bold text-slate-600">Kết thúc</span><input type="datetime-local" {...form.register('endsAt')} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-rose-300" /><p className="mt-1 text-xs text-rose-500">{form.formState.errors.endsAt?.message}</p></label>
          </div>
          <div className="flex flex-wrap gap-2"><Button type="submit" loading={saveMutation.isPending}><Power size={16} weight="bold" /> Lưu cấu hình</Button>{statusQuery.data?.enabled ? <Button type="button" variant="danger" loading={disableMutation.isPending} onClick={() => disableMutation.mutate()}>Tắt khẩn cấp</Button> : null}</div>
        </div>

        <aside className="relative overflow-hidden rounded-2xl border border-rose-100 bg-[#fffafd] p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(135deg,rgba(251,113,133,0.14),rgba(186,230,253,0.2))]" />
          <div className="relative flex items-center justify-between"><p className="flex items-center gap-2 text-xs font-black text-rose-600"><CalendarBlank size={16} weight="fill" /> Xem trước giao diện user</p><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-400 shadow-sm">Live preview</span></div>
          <div className="relative mt-3 rounded-2xl border border-white bg-white/80 p-4 text-center shadow-[0_16px_36px_rgba(251,113,133,0.12)] backdrop-blur">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-slate-800"><HiLogo size={20} /> Hi <span className="text-rose-500">Lover</span></div>
            <MaintenanceVisual compact />
            <motion.div key={`${values.title}-${values.message}`} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0.01 : 0.22 }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600"><Wrench size={13} weight="fill" /> Đang bảo trì</span>
              <h3 className="mt-3 text-lg font-extrabold text-slate-950">{values.title || 'Hi đang được chăm sóc'}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{values.message || 'Thông điệp bảo trì sẽ hiển thị ở đây.'}</p>
              <div className="mt-4 grid grid-cols-4 gap-1.5"><span className="rounded-xl border border-slate-100 bg-white px-1 py-2 text-sm font-black text-rose-500">00</span><span className="rounded-xl border border-slate-100 bg-white px-1 py-2 text-sm font-black text-rose-500">02</span><span className="rounded-xl border border-slate-100 bg-white px-1 py-2 text-sm font-black text-rose-500">15</span><span className="rounded-xl border border-slate-100 bg-white px-1 py-2 text-sm font-black text-rose-500">37</span></div>
              <p className="mt-3 text-[11px] font-bold text-slate-400">{values.mode === 'SCHEDULED' ? 'Sẽ tự bật theo lịch' : 'Bật ngay sau khi lưu'}</p>
            </motion.div>
          </div>
        </aside>
      </form>
      <AnimatePresence>
        {confirmOpen ? <motion.div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="maintenance-confirm-title" className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-5 shadow-2xl shadow-slate-900/20" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }} animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-600"><WarningCircle size={23} weight="fill" /></span><button type="button" onClick={() => setConfirmOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Đóng"><X size={17} weight="bold" /></button></div>
            <h3 id="maintenance-confirm-title" className="mt-4 text-xl font-extrabold text-slate-950">Bật bảo trì ngay?</h3><p className="mt-2 text-sm leading-6 text-slate-600">User sẽ chuyển sang trang bảo trì ngay sau khi trạng thái được lưu. Admin vẫn có thể truy cập hệ thống.</p>
            <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>Quay lại</Button><Button type="button" loading={saveMutation.isPending} onClick={() => { setConfirmOpen(false); saveMutation.mutate(values); }}>Bật bảo trì</Button></div>
          </motion.section>
        </motion.div> : null}
      </AnimatePresence>
    </section>
  );
}

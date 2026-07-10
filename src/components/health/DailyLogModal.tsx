import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { DailyLog, FlowIntensity, SymptomCategory, SymptomDictionary, UpsertDailyLogDto, CycleRecord } from '../../types/shared';
import api from '../../lib/api';
import { getUserFacingError } from '../../lib/userFacingError';
import ResponsiveModal from '../ui/ResponsiveModal';

export type DailyLogMode = 'default' | 'periodStart';

interface DailyLogModalProps {
  open: boolean;
  mode: DailyLogMode;
  initialDate?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface SymptomGroup {
  category: SymptomCategory;
  title: string;
  description: string;
  icon: string;
  accentClassName: string;
  singleSelect?: boolean;
}

const FLOW_OPTIONS: Array<{ value: FlowIntensity; label: string; icon: string }> = [
  { value: 'NONE', label: 'Không có', icon: 'water_drop' },
  { value: 'LIGHT', label: 'Ít', icon: 'water_drop' },
  { value: 'MEDIUM', label: 'Vừa', icon: 'water_drop' },
  { value: 'HEAVY', label: 'Nhiều', icon: 'water_drop' },
];

const GROUPS: SymptomGroup[] = [
  { category: 'EMOTIONAL', title: 'Tâm trạng', description: 'Bạn có thể chọn nhiều cảm xúc trong ngày.', icon: 'mood', accentClassName: 'text-amber-500 bg-amber-50' },
  { category: 'PHYSICAL', title: 'Triệu chứng cơ thể', description: 'Ghi lại các dấu hiệu bạn đang cảm nhận.', icon: 'monitor_heart', accentClassName: 'text-rose-500 bg-rose-50' },
  { category: 'OTHER', title: 'Tiêu hóa', description: 'Các thay đổi tiêu hóa thường gặp trong chu kỳ.', icon: 'spa', accentClassName: 'text-fuchsia-500 bg-fuchsia-50' },
  { category: 'FLUID', title: 'Tiết dịch âm đạo', description: 'Chọn mô tả phù hợp nhất trong ngày.', icon: 'water_drop', accentClassName: 'text-violet-500 bg-violet-50', singleSelect: true },
];

const COMMON_NAMES = ['Đau bụng', 'Mệt mỏi', 'Đầy hơi', 'Đau đầu', 'Ngực đau', 'Mất ngủ'];

const ICON_BY_NAME: Record<string, string> = {
  'Đau bụng': 'monitor_heart',
  'Đau đầu': 'psychology',
  'Mệt mỏi': 'nightlight',
  'Đầy hơi': 'foggy',
  'Nổi mụn': 'face',
  'Đau lưng': 'monitor_heart',
  'Ngực đau': 'favorite',
  'Buồn nôn': 'mood',
  'Mất ngủ': 'nightlight',
  'Chóng mặt': 'progress_activity',
  'Thèm ăn': 'local_mall',
  'Ngứa âm đạo': 'privacy_tip',
  'Khô âm đạo': 'water_drop',
};

const DISPLAY_NAME_FIXES: Record<string, string> = {
  'spotted form': 'Dạng đốm',
  spotting: 'Dạng đốm',
};

function getDisplayName(symptom: SymptomDictionary) {
  const name = symptom.name.trim();
  const directFix = DISPLAY_NAME_FIXES[name.toLocaleLowerCase('en-US')];
  if (directFix) return directFix;

  const lowerName = name.toLocaleLowerCase('vi-VN');
  const compactName = lowerName.replace(/\s+/g, ' ');

  if (name.includes('�')) {
    if (/^ch.*ng mặt/.test(compactName)) return 'Chóng mặt';
    if (/^kh.*m đạo/.test(compactName)) return 'Khô âm đạo';
    if (/^ng.*m đạo/.test(compactName)) return 'Ngứa âm đạo';
    if (/^th.*m ăn/.test(compactName)) return 'Thèm ăn';
    if (/^ti.*u chảy/.test(compactName)) return 'Tiêu chảy';
    if (/^t.*o b.*n/.test(compactName)) return 'Táo bón';
    if (/^bu.*n n.*n/.test(compactName)) return 'Buồn nôn';
    if (/^d.*ng d.*nh/.test(compactName)) return 'Dạng dính';
    if (/^kh.*ng c.* d.*ch/.test(compactName)) return 'Không có dịch';
    if (/^nh.* l.*ng trắng trứng/.test(compactName)) return 'Như lòng trắng trứng';
    if (/^trắng, v.*n c.*c/.test(compactName)) return 'Trắng, vón cục';
    if (/^x.*m$/.test(compactName)) return 'Xám';
  }

  return name;
}

function getDisplayKey(symptom: SymptomDictionary) {
  return getDisplayName(symptom).toLocaleLowerCase('vi-VN');
}

function dedupeSymptoms(symptoms: SymptomDictionary[], selectedSymptoms: Set<number>) {
  const byDisplayName = new Map<string, SymptomDictionary>();

  symptoms.forEach((symptom) => {
    const key = getDisplayKey(symptom);
    const current = byDisplayName.get(key);
    if (!current || selectedSymptoms.has(symptom.id)) {
      byDisplayName.set(key, symptom);
    }
  });

  return Array.from(byDisplayName.values());
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromIsoDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(value: string, amount: number) {
  const date = fromIsoDate(value);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount));
}

function formatDate(value: string) {
  return fromIsoDate(value).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getIcon(symptom: SymptomDictionary) {
  if (symptom.category === 'EMOTIONAL') return 'mood';
  if (symptom.category === 'FLUID') return 'water_drop';
  if (symptom.category === 'OTHER') return 'spa';
  return ICON_BY_NAME[getDisplayName(symptom)] ?? 'monitor_heart';
}

export default function DailyLogModal({ open, mode, initialDate, onClose, onSaved }: DailyLogModalProps) {
  const queryClient = useQueryClient();
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<number>>(new Set());
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity>('NONE');
  const [hasClots, setHasClots] = useState(false);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const [confirmPeriodStart, setConfirmPeriodStart] = useState(false);

  const { data: cyclesData } = useQuery<{ cycleRecords: CycleRecord[] }>({
    queryKey: ['cycles-for-log-check', selectedDate],
    queryFn: () => api.get('/cycle-records', { params: { from: selectedDate, to: selectedDate } }).then(({ data }) => data),
    enabled: open,
  });

  const isExistingPeriodStart = useMemo(() => {
    return !!cyclesData?.cycleRecords?.some(c => c.startDate.slice(0, 10) === selectedDate);
  }, [cyclesData, selectedDate]);

  useEffect(() => {
    if (mode === 'periodStart') {
      setConfirmPeriodStart(true);
    } else {
      setConfirmPeriodStart(isExistingPeriodStart);
    }
  }, [selectedDate, isExistingPeriodStart, mode]);

  useEffect(() => {
    if (open) {
      setSelectedDate(initialDate ?? today);
      setSearch('');
    }
  }, [initialDate, open, today]);

  const dictionaryQuery = useQuery<SymptomDictionary[]>({
    queryKey: ['symptom-dictionaries'],
    queryFn: () => api.get('/symptom-dictionaries').then(({ data }) => data.symptoms ?? []),
    enabled: open,
  });

  const logQuery = useQuery<DailyLog | null>({
    queryKey: ['daily-log', selectedDate],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/daily-logs/${selectedDate}`);
        return data.dailyLog as DailyLog;
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404)) return null;
        throw error;
      }
    },
    enabled: open,
    retry: false,
  });

  useEffect(() => {
    if (!open || logQuery.isLoading || logQuery.isFetching) return;
    const log = logQuery.data;
    setFlowIntensity(log?.flowIntensity ?? 'NONE');
    setHasClots(log?.hasClots ?? false);
    setNotes(log?.notes ?? '');
    setSelectedSymptoms(new Set(log?.symptoms?.map((symptom) => symptom.symptomId) ?? []));
  }, [logQuery.data, logQuery.isFetching, logQuery.isLoading, open, selectedDate]);

  const rawDictionary = dictionaryQuery.data ?? [];
  const hasDetailedMoods = rawDictionary.some((symptom) => symptom.category === 'EMOTIONAL' && symptom.name !== 'Tâm trạng thay đổi');
  const dictionary = hasDetailedMoods
    ? rawDictionary.filter((symptom) => symptom.name !== 'Tâm trạng thay đổi')
    : rawDictionary;
  const dedupedDictionary = dedupeSymptoms(dictionary, selectedSymptoms);
  const normalizedSearch = search.trim().toLocaleLowerCase('vi-VN');
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    symptoms: dedupedDictionary.filter((symptom) => symptom.category === group.category && (!normalizedSearch || getDisplayKey(symptom).includes(normalizedSearch))),
  })).filter((group) => group.symptoms.length > 0);
  const commonSymptoms = COMMON_NAMES
    .map((name) => dedupedDictionary.find((symptom) => getDisplayName(symptom) === name))
    .filter((symptom): symptom is SymptomDictionary => !!symptom);

  const toggleSymptom = (symptom: SymptomDictionary) => {
    setSelectedSymptoms((current) => {
      const next = new Set(current);
      if (next.has(symptom.id)) {
        next.delete(symptom.id);
        return next;
      }
      if (symptom.category === 'FLUID') {
        dictionary.filter((item) => item.category === 'FLUID').forEach((item) => next.delete(item.id));
      }
      next.add(symptom.id);
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (confirmPeriodStart && flowIntensity === 'NONE') {
        throw new Error('Hãy chọn lượng kinh để xác nhận kỳ kinh bắt đầu.');
      }
      if (!confirmPeriodStart && flowIntensity === 'NONE' && !hasClots && selectedSymptoms.size === 0 && !notes.trim()) {
        throw new Error('Hãy chọn ít nhất một thông tin trước khi lưu nhật ký.');
      }
      const payload: UpsertDailyLogDto = {
        flowIntensity,
        hasClots,
        confirmPeriodStart,
        notes: notes.trim(),
        symptoms: Array.from(selectedSymptoms).map((symptomId) => ({ symptomId, severity: 'MILD' })),
      };
      await api.put(`/daily-logs/${selectedDate}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['daily-log', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['cycle-insights'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success('Đã lưu nhật ký sức khỏe');
      onSaved();
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(getUserFacingError(error, 'Không thể lưu nhật ký sức khỏe'));
    },
  });

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className="hi-btn-secondary rounded-xl px-5 py-3 text-sm font-bold">
        Hủy
      </button>
      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || (confirmPeriodStart && flowIntensity === 'NONE')}
        className="hi-btn-primary rounded-xl px-6 py-3 text-sm font-bold"
      >
        {saveMutation.isPending ? 'Đang lưu...' : confirmPeriodStart ? 'Xác nhận bắt đầu kỳ' : 'Lưu nhật ký'}
      </button>
    </div>
  );

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={confirmPeriodStart ? 'Xác nhận bắt đầu kỳ' : 'Nhật ký sức khỏe'}
      description={confirmPeriodStart ? 'Ghi lượng kinh thực tế để xác nhận Ngày 1 của kỳ kinh mới.' : 'Chọn những thay đổi bạn ghi nhận trong ngày.'}
      icon="monitor_heart"
      maxWidthClassName="sm:max-w-5xl"
      bodyClassName="bg-slate-50/80"
      footer={footer}
    >
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="flex size-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-rose-50"
            aria-label="Ngày trước"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-500">
              {confirmPeriodStart ? 'Bắt đầu kỳ kinh' : selectedDate === today ? 'Hôm nay' : 'Nhật ký ngày'}
            </p>
            <p className="mt-1 text-sm font-extrabold capitalize text-slate-800">{formatDate(selectedDate)}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            disabled={selectedDate >= today}
            className="flex size-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-rose-50 disabled:opacity-25"
            aria-label="Ngày sau"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        <div className="mt-3 flex justify-center">
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 outline-none transition-colors focus:border-rose-300"
            aria-label="Chọn ngày nhật ký"
          />
        </div>
        <label className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <span className="material-symbols-outlined text-[20px] text-slate-400">search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm triệu chứng"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        {logQuery.isLoading || dictionaryQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-3xl bg-white" />)}
          </div>
        ) : (
          <>
            {!search && commonSymptoms.length > 0 && (
              <section className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-rose-500">history</span>
                  <h3 className="text-sm font-extrabold text-slate-800">Thường ghi gần đây</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {commonSymptoms.map((symptom) => <SymptomChip key={symptom.id} symptom={symptom} active={selectedSymptoms.has(symptom.id)} onClick={() => toggleSymptom(symptom)} />)}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start gap-2">
                <span className="material-symbols-outlined rounded-xl bg-rose-50 p-2 text-rose-500">water_drop</span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Lượng kinh nguyệt</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Ước tính lượng kinh trung bình trong ngày.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {FLOW_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setFlowIntensity(option.value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${flowIntensity === option.value ? 'border-rose-400 bg-rose-500 text-white' : 'border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-300'}`}
                  >
                    <span className="material-symbols-outlined text-[17px]">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setHasClots((current) => !current)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${hasClots ? 'border-rose-400 bg-rose-500 text-white' : 'border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-300'}`}
                >
                  <span className="material-symbols-outlined text-[17px]">bloodtype</span>
                  Cục máu đông
                </button>
              </div>

              {/* Toggle switch for confirmPeriodStart */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col gap-0.5 pr-4 text-left">
                  <span className="text-xs font-black uppercase tracking-wide text-rose-500">Kích hoạt kỳ kinh mới</span>
                  <span className="text-sm font-extrabold text-slate-800">Đánh dấu ngày này là ngày bắt đầu kỳ kinh mới</span>
                  <span className="text-[11px] font-semibold text-slate-400 leading-snug">
                    Hi sẽ tự động tạo một chu kỳ kinh nguyệt mới bắt đầu từ ngày này.
                  </span>
                  {isExistingPeriodStart && (
                    <span className="mt-1 inline-flex items-center gap-1 w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      Đã ghi nhận trong lịch sử chu kỳ
                    </span>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmPeriodStart}
                    disabled={isExistingPeriodStart}
                    onChange={(e) => setConfirmPeriodStart(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 ${isExistingPeriodStart ? 'opacity-60 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>
            </section>

            {visibleGroups.map((group) => (
              <section key={group.category} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start gap-2">
                  <span className={`material-symbols-outlined rounded-xl p-2 ${group.accentClassName}`}>{group.icon}</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">{group.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{group.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.symptoms.map((symptom) => <SymptomChip key={symptom.id} symptom={symptom} active={selectedSymptoms.has(symptom.id)} onClick={() => toggleSymptom(symptom)} />)}
                </div>
              </section>
            ))}

            {visibleGroups.length === 0 && search && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300">search_off</span>
                <p className="mt-2 text-sm font-bold text-slate-600">Không tìm thấy triệu chứng phù hợp</p>
              </div>
            )}

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-teal-500">edit_note</span>
                <h3 className="text-sm font-extrabold text-slate-800">Ghi chú</h3>
              </div>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Thêm cảm giác, triệu chứng khác hoặc điều bạn muốn nhớ..."
                className="w-full resize-none rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-rose-200"
              />
            </section>
          </>
        )}
      </div>
    </ResponsiveModal>
  );
}

function SymptomChip({ symptom, active, onClick }: { symptom: SymptomDictionary; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] ${active ? 'border-rose-400 bg-rose-500 text-white shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-rose-200 hover:bg-rose-50'}`}
    >
      <span className="material-symbols-outlined text-[17px]">{getIcon(symptom)}</span>
      {getDisplayName(symptom)}
    </button>
  );
}

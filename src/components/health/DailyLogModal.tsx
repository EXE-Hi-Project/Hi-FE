import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  Bandaids,
  BatteryLow,
  Brain,
  CheckCircle,
  CircleHalf,
  CirclesThree,
  CirclesThreePlus,
  ClockCounterClockwise,
  Cloud,
  DotsThreeCircle,
  Drop,
  DropHalf,
  DropHalfBottom,
  DropSlash,
  Egg,
  FirstAid,
  ForkKnife,
  HeartBreak,
  Heartbeat,
  Lightning,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  MoonStars,
  NotePencil,
  Palette,
  PersonArmsSpread,
  PersonSimple,
  Prohibit,
  Pulse,
  ShieldWarning,
  Smiley,
  SmileyAngry,
  SmileyNervous,
  SmileySad,
  SmileyXEyes,
  Sparkle,
  ThermometerHot,
  Toilet,
  ToiletPaper,
  WarningDiamond,
  WarningCircle,
  Wind,
} from '@phosphor-icons/react';
import type { DailyLog, FlowIntensity, SymptomDictionary, SymptomSeverity, UpsertDailyLogDto, CycleRecord } from '../../types/shared';
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
  kind: 'BODY' | 'DIGESTIVE' | 'EMOTIONAL' | 'FLUID' | 'ATTENTION';
  title: string;
  description: string;
  Icon: ComponentType<IconProps>;
  accentClassName: string;
}

const FLOW_OPTIONS: Array<{ value: FlowIntensity; label: string }> = [
  { value: 'NONE', label: 'Không có' },
  { value: 'LIGHT', label: 'Ít' },
  { value: 'MEDIUM', label: 'Vừa' },
  { value: 'HEAVY', label: 'Nhiều' },
];

const GROUPS: SymptomGroup[] = [
  { kind: 'BODY', title: 'Đau và cơ thể', description: 'Ghi lại những thay đổi bạn đang cảm nhận.', Icon: PersonArmsSpread, accentClassName: 'text-rose-500 bg-rose-50' },
  { kind: 'DIGESTIVE', title: 'Tiêu hóa', description: 'Các thay đổi tiêu hóa thường gặp trong chu kỳ.', Icon: ForkKnife, accentClassName: 'text-fuchsia-500 bg-fuchsia-50' },
  { kind: 'EMOTIONAL', title: 'Tâm trạng', description: 'Bạn có thể chọn nhiều cảm xúc trong ngày.', Icon: Smiley, accentClassName: 'text-amber-500 bg-amber-50' },
  { kind: 'FLUID', title: 'Tiết dịch âm đạo', description: 'Chọn mô tả phù hợp nhất trong ngày.', Icon: Drop, accentClassName: 'text-violet-500 bg-violet-50' },
  { kind: 'ATTENTION', title: 'Dấu hiệu cần lưu ý', description: 'Các dấu hiệu nên được theo dõi kỹ hoặc trao đổi với nhân viên y tế.', Icon: ShieldWarning, accentClassName: 'text-red-600 bg-red-50' },
];

const COMMON_NAMES = ['Đau bụng', 'Mệt mỏi', 'Đầy hơi', 'Đau đầu', 'Ngực đau', 'Mất ngủ'];

const ATTENTION_NAMES = new Set([
  'Đau dữ dội',
  'Chảy máu giữa kỳ',
  'Đau khi quan hệ',
  'Đau khi tiểu tiện',
  'Đau khi đại tiện',
  'Sốt',
  'Choáng hoặc ngất',
  'Dịch có mùi hôi',
  'Dịch đổi màu bất thường',
]);

const URGENT_NAMES = new Set(['Đau dữ dội', 'Choáng hoặc ngất']);
const PAIN_NAMES = new Set(['Đau bụng', 'Đau vùng chậu', 'Đau dữ dội']);
const ABNORMAL_FLUID_NAMES = new Set(['Dịch có mùi hôi', 'Dịch đổi màu bất thường', 'Bất thường', 'Trắng, vón cục', 'Xám']);

const ICON_BY_NAME: Record<string, ComponentType<IconProps>> = {
  'Đau bụng': Pulse,
  'Đau đầu': Brain,
  'Mệt mỏi': BatteryLow,
  'Nổi mụn': CirclesThree,
  'Đau lưng': PersonSimple,
  'Ngực đau': Heartbeat,
  'Mất ngủ': MoonStars,
  'Chóng mặt': ArrowsClockwise,
  'Thèm ăn': ForkKnife,
  'Ngứa âm đạo': Bandaids,
  'Khô âm đạo': DropSlash,
  'Đau vùng chậu': PersonArmsSpread,
  'Đau dữ dội': WarningCircle,
  'Chảy máu giữa kỳ': DropHalf,
  'Đau khi quan hệ': HeartBreak,
  'Đau khi tiểu tiện': DropHalfBottom,
  'Đau khi đại tiện': Toilet,
  'Sốt': ThermometerHot,
  'Choáng hoặc ngất': WarningDiamond,
  'Bình tĩnh': Smiley,
  'Vui vẻ': Smiley,
  'Mạnh mẽ': Lightning,
  'Phấn chấn': Sparkle,
  'Thất thường': ArrowsClockwise,
  'Bực bội': SmileyAngry,
  'Buồn': SmileySad,
  'Lo lắng': SmileyNervous,
  'Thiếu năng lượng': BatteryLow,
  'Buồn nôn': SmileyXEyes,
  'Đầy hơi': Wind,
  'Táo bón': Prohibit,
  'Tiêu chảy': ToiletPaper,
  'Không có dịch': DropSlash,
  'Trắng đục': Cloud,
  'Ẩm ướt': Drop,
  'Dạng dính': DropHalf,
  'Như lòng trắng trứng': Egg,
  'Dạng đốm': DotsThreeCircle,
  'Bất thường': WarningCircle,
  'Trắng, vón cục': CirclesThreePlus,
  'Xám': CircleHalf,
  'Dịch có mùi hôi': WarningDiamond,
  'Dịch đổi màu bất thường': Palette,
};

const SEVERITY_OPTIONS: Array<{ value: SymptomSeverity; label: string; description: string }> = [
  { value: 'MILD', label: 'Nhẹ', description: 'Không ảnh hưởng sinh hoạt' },
  { value: 'MODERATE', label: 'Vừa', description: 'Ảnh hưởng một phần' },
  { value: 'SEVERE', label: 'Nặng', description: 'Cản trở hoạt động thường ngày' },
];

const DISPLAY_NAME_FIXES: Record<string, string> = {
  'spotted form': 'Dạng đốm',
  spotting: 'Dạng đốm',
  'bệnh tĩnh': 'Bình tĩnh',
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

function getSymptomIcon(symptom: SymptomDictionary) {
  const name = getDisplayName(symptom);
  if (ICON_BY_NAME[name]) return ICON_BY_NAME[name];
  if (symptom.category === 'EMOTIONAL') return Smiley;
  if (symptom.category === 'FLUID') return Drop;
  if (symptom.category === 'OTHER') return ForkKnife;
  return FirstAid;
}

function matchesGroup(symptom: SymptomDictionary, kind: SymptomGroup['kind']) {
  const name = getDisplayName(symptom);
  if (kind === 'ATTENTION') return ATTENTION_NAMES.has(name);
  if (ATTENTION_NAMES.has(name)) return false;
  if (kind === 'BODY') return symptom.category === 'PHYSICAL';
  if (kind === 'DIGESTIVE') return symptom.category === 'OTHER';
  if (kind === 'EMOTIONAL') return symptom.category === 'EMOTIONAL';
  return symptom.category === 'FLUID';
}

export default function DailyLogModal({ open, mode, initialDate, onClose, onSaved }: DailyLogModalProps) {
  const queryClient = useQueryClient();
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<number>>(new Set());
  const [symptomSeverities, setSymptomSeverities] = useState<Map<number, SymptomSeverity>>(new Map());
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
    setSymptomSeverities(new Map(log?.symptoms?.map((symptom) => [symptom.symptomId, symptom.severity]) ?? []));
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
    symptoms: dedupedDictionary.filter((symptom) => matchesGroup(symptom, group.kind) && (!normalizedSearch || getDisplayKey(symptom).includes(normalizedSearch))),
  })).filter((group) => group.symptoms.length > 0);
  const commonSymptoms = COMMON_NAMES
    .map((name) => dedupedDictionary.find((symptom) => getDisplayName(symptom) === name))
    .filter((symptom): symptom is SymptomDictionary => !!symptom);

  const toggleSymptom = (symptom: SymptomDictionary) => {
    const isSelected = selectedSymptoms.has(symptom.id);
    if (isSelected) {
      setSelectedSymptoms((current) => {
        const next = new Set(current);
        next.delete(symptom.id);
        return next;
      });
      setSymptomSeverities((current) => {
        const next = new Map(current);
        next.delete(symptom.id);
        return next;
      });
      return;
    }

    if (symptom.category === 'FLUID') {
      const fluidIds = dictionary.filter((item) => item.category === 'FLUID').map((item) => item.id);
      setSelectedSymptoms((current) => {
        const next = new Set(current);
        fluidIds.forEach((id) => next.delete(id));
        next.add(symptom.id);
        return next;
      });
      setSymptomSeverities((current) => {
        const next = new Map(current);
        fluidIds.forEach((id) => next.delete(id));
        next.set(symptom.id, 'MILD');
        return next;
      });
      return;
    }

    setSelectedSymptoms((current) => new Set(current).add(symptom.id));
    setSymptomSeverities((current) => new Map(current).set(symptom.id, 'MILD'));
  };

  const selectedSymptomDetails = dedupedDictionary.filter((symptom) => selectedSymptoms.has(symptom.id));
  const selectedNames = new Set(selectedSymptomDetails.map(getDisplayName));
  const hasSeverePain = selectedSymptomDetails.some((symptom) =>
    PAIN_NAMES.has(getDisplayName(symptom)) && symptomSeverities.get(symptom.id) === 'SEVERE');
  const hasFeverWithConcern = selectedNames.has('Sốt')
    && (selectedSymptomDetails.some((symptom) => PAIN_NAMES.has(getDisplayName(symptom)))
      || selectedSymptomDetails.some((symptom) => ABNORMAL_FLUID_NAMES.has(getDisplayName(symptom))));
  const hasUrgentSignal = hasSeverePain
    || hasFeverWithConcern
    || Array.from(URGENT_NAMES).some((name) => selectedNames.has(name));
  const hasMedicalAttentionSignal = hasUrgentSignal
    || selectedNames.has('Chảy máu giữa kỳ')
    || selectedSymptomDetails.some((symptom) => ABNORMAL_FLUID_NAMES.has(getDisplayName(symptom)))
    || (flowIntensity === 'HEAVY' && hasClots);

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
        symptoms: Array.from(selectedSymptoms).map((symptomId) => ({
          symptomId,
          severity: symptomSeverities.get(symptomId) ?? 'MILD',
        })),
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
      icon={<Heartbeat size={22} weight="duotone" aria-hidden="true" />}
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
            <ArrowLeft size={20} weight="bold" aria-hidden="true" />
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
            <ArrowRight size={20} weight="bold" aria-hidden="true" />
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
          <MagnifyingGlass size={20} className="text-slate-400" aria-hidden="true" />
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
                  <ClockCounterClockwise size={20} className="text-rose-500" aria-hidden="true" />
                  <h3 className="text-sm font-extrabold text-slate-800">Thường ghi gần đây</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {commonSymptoms.map((symptom) => <SymptomChip key={symptom.id} symptom={symptom} active={selectedSymptoms.has(symptom.id)} onClick={() => toggleSymptom(symptom)} />)}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start gap-2">
                <span className="rounded-xl bg-rose-50 p-2 text-rose-500"><Drop size={20} weight="fill" aria-hidden="true" /></span>
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
                    {option.value === 'NONE'
                      ? <DropSlash size={17} weight={flowIntensity === option.value ? 'bold' : 'regular'} aria-hidden="true" />
                      : <Drop size={17} weight={flowIntensity === option.value ? 'fill' : 'regular'} aria-hidden="true" />}
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setHasClots((current) => !current)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${hasClots ? 'border-rose-400 bg-rose-500 text-white' : 'border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-300'}`}
                >
                  <CirclesThreePlus size={17} weight={hasClots ? 'fill' : 'regular'} aria-hidden="true" />
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
                      <CheckCircle size={12} weight="fill" aria-hidden="true" />
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
              <section key={group.kind} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start gap-2">
                  <span className={`rounded-xl p-2 ${group.accentClassName}`}><group.Icon size={20} weight="duotone" aria-hidden="true" /></span>
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
                <MagnifyingGlassMinus size={30} className="mx-auto text-slate-300" aria-hidden="true" />
                <p className="mt-2 text-sm font-bold text-slate-600">Không tìm thấy triệu chứng phù hợp</p>
              </div>
            )}

            {selectedSymptomDetails.length > 0 && (
              <section className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start gap-2">
                  <span className="rounded-xl bg-violet-50 p-2 text-violet-500"><FirstAid size={20} weight="duotone" aria-hidden="true" /></span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Mức độ từng triệu chứng</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Mức độ giúp Hi phân tích chính xác hơn, không dùng để chẩn đoán.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedSymptomDetails.map((symptom) => (
                    <div key={symptom.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-black text-slate-700">{getDisplayName(symptom)}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {SEVERITY_OPTIONS.map((option) => {
                          const active = (symptomSeverities.get(symptom.id) ?? 'MILD') === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setSymptomSeverities((current) => new Map(current).set(symptom.id, option.value))}
                              className={`rounded-xl border px-3 py-2 text-left transition-colors ${active ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200'}`}
                              aria-pressed={active}
                            >
                              <span className="block text-xs font-extrabold">{option.label}</span>
                              <span className="mt-0.5 block text-[10px] font-semibold leading-snug opacity-75">{option.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {hasMedicalAttentionSignal && (
              <section role="alert" className={`rounded-3xl border p-4 ${hasUrgentSignal ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-start gap-3">
                  <WarningCircle size={22} weight="fill" className={hasUrgentSignal ? 'text-red-600' : 'text-amber-600'} aria-hidden="true" />
                  <div>
                    <h3 className={`text-sm font-black ${hasUrgentSignal ? 'text-red-800' : 'text-amber-800'}`}>
                      {hasUrgentSignal ? 'Bạn nên được hỗ trợ y tế sớm' : 'Bạn nên theo dõi và trao đổi với nhân viên y tế'}
                    </h3>
                    <p className={`mt-1 text-xs font-semibold leading-relaxed ${hasUrgentSignal ? 'text-red-700' : 'text-amber-700'}`}>
                      {hasUrgentSignal
                        ? 'Nếu đau dữ dội, choáng/ngất, sốt kèm đau hoặc tình trạng xấu đi nhanh, hãy liên hệ cơ sở y tế hoặc dịch vụ cấp cứu tại nơi bạn sống.'
                        : 'Chảy máu bất thường, lượng kinh nhiều kèm cục máu đông hoặc dịch bất thường nên được bác sĩ đánh giá nếu kéo dài, tái diễn hoặc ảnh hưởng sinh hoạt.'}
                    </p>
                    <p className="mt-2 text-[10px] font-bold text-slate-500">Thông tin này không thay thế chẩn đoán hoặc tư vấn của bác sĩ.</p>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <NotePencil size={20} className="text-teal-500" aria-hidden="true" />
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
  const Icon = getSymptomIcon(symptom);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] ${active ? 'border-rose-400 bg-rose-500 text-white shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-rose-200 hover:bg-rose-50'}`}
    >
      <Icon size={18} weight={active ? 'fill' : 'duotone'} className="shrink-0" aria-hidden="true" />
      {getDisplayName(symptom)}
    </button>
  );
}

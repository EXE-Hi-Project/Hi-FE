import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import Navbar from '../layout/Navbar';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { usePartnerConnection } from '../../hooks/usePartnerConnection';
import { useSubscription } from '../../hooks/useSubscription';
import { buildPartnerInviteUrl, normalizePartnerInviteCode } from '../../utils/partnerInvite';

type Variant = 'female' | 'male';
type AiResponseStyle = 'FRIENDLY' | 'PLAYFUL' | 'SCIENTIFIC' | 'CONCISE' | 'CARE_PARTNER';

interface NotificationSettings {
  periodUpcomingEnabled: boolean;
  fertilityWindowEnabled: boolean;
  dailyHealthTipsEnabled: boolean;
  partnerPeriodAlertEnabled: boolean;
  partnerMoodUpdatesEnabled: boolean;
  partnerCareTipsEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  reminderDaysBefore: number;
  symptomDailyReminderEnabled: boolean;
  symptomReminderTime: string;
  partnerEndOfDayNudgeEnabled: boolean;
  partnerNudgeTime: string;
  aiResponseStyle: AiResponseStyle;
  dailyQuestionsEnabled: boolean;
  contextualCareSuggestionsEnabled: boolean;
  coupleQuestionAnswerEmailEnabled: boolean;
  coupleQuestionCommentEmailEnabled: boolean;
  coupleQuestionEditEmailEnabled: boolean;
}

interface PartnerCyclesResponse {
  partner?: {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string;
    gender?: string;
  } | null;
}

interface PartnerSharingSettings {
  shareDetailedSymptoms: boolean;
  shareHealthNotes: boolean;
  shareMood: boolean;
  shareCycleData: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  periodUpcomingEnabled: true,
  fertilityWindowEnabled: false,
  dailyHealthTipsEnabled: true,
  partnerPeriodAlertEnabled: true,
  partnerMoodUpdatesEnabled: true,
  partnerCareTipsEnabled: false,
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  reminderDaysBefore: 3,
  symptomDailyReminderEnabled: true,
  symptomReminderTime: '20:00',
  partnerEndOfDayNudgeEnabled: false,
  partnerNudgeTime: '21:00',
  aiResponseStyle: 'FRIENDLY',
  dailyQuestionsEnabled: false,
  contextualCareSuggestionsEnabled: false,
  coupleQuestionAnswerEmailEnabled: true,
  coupleQuestionCommentEmailEnabled: false,
  coupleQuestionEditEmailEnabled: false,
};

const DEFAULT_SHARING: PartnerSharingSettings = {
  shareDetailedSymptoms: false,
  shareHealthNotes: false,
  shareMood: false,
  shareCycleData: false,
};

const aiStyles: Array<{ value: AiResponseStyle; label: string; desc: string }> = [
  { value: 'FRIENDLY', label: 'Ấm áp', desc: 'Gần gũi, dịu dàng, dễ nghe.' },
  { value: 'PLAYFUL', label: 'Nhí nhảnh', desc: 'Vui nhẹ, có năng lượng hơn.' },
  { value: 'SCIENTIFIC', label: 'Khoa học', desc: 'Rõ nguồn logic, ít cảm tính.' },
  { value: 'CONCISE', label: 'Ngắn gọn', desc: 'Đi thẳng vào ý chính.' },
  { value: 'CARE_PARTNER', label: 'Chăm Người ấy', desc: 'Gợi ý quan tâm tinh tế.' },
];

const DAILY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function todayInviteKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function buildDailyPartnerCode(baseCode?: string | null) {
  if (!baseCode) return '';
  const source = `${baseCode.toUpperCase()}-${todayInviteKey()}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let value = hash >>> 0;
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    value = Math.imul(value ^ (index + 11), 1103515245) + 12345;
    code += DAILY_CODE_ALPHABET[(value >>> 0) % DAILY_CODE_ALPHABET.length];
  }
  return code;
}

function InviteQrPreview({ code }: { code: string }) {
  return (
    <div className="grid size-36 place-items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="MÃ£ QR má»i">
      <QRCode value={code || 'HI'} size={120} bgColor="#ffffff" fgColor="#0f172a" level="M" />
    </div>
  );
}

function Toggle({ checked, onChange, accent, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; accent: Variant; disabled?: boolean }) {
  const activeClass = accent === 'male' ? 'peer-checked:bg-sky-500' : 'peer-checked:bg-rose-500';

  return (
    <label className={`relative inline-flex items-center min-h-[44px] ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className={`h-7 w-12 rounded-full bg-slate-200 transition-colors after:absolute after:left-1 after:top-[10px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 ${activeClass}`} />
    </label>
  );
}

function SettingRow({
  title,
  desc,
  checked,
  onChange,
  accent,
  hot,
  premium,
  disabled,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  accent: Variant;
  hot?: boolean;
  premium?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0 last:pb-0 first:pt-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-black text-slate-800 leading-snug">{title}</p>
          {hot && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-700 uppercase tracking-wider">HOT</span>}
          {premium && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-rose-600">HI PRO</span>}
        </div>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400">{desc}</p>
      </div>
      <div className="flex-shrink-0">
        <Toggle checked={checked} onChange={onChange} accent={accent} disabled={disabled} />
      </div>
    </div>
  );
}

function ChannelButton({
  label,
  icon,
  active,
  disabled,
  onClick,
  accent,
}: {
  label: string;
  icon: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  accent: Variant;
}) {
  const activeClass = accent === 'male'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : 'border-rose-200 bg-rose-50 text-rose-600';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${
        active ? activeClass : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
      }`}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      {label}
      {disabled && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Sắp hỗ trợ</span>}
    </button>
  );
}

export default function NotificationSettingsPanel({ variant }: { variant: Variant }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const subscriptionQuery = useSubscription();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [sharing, setSharing] = useState<PartnerSharingSettings>(DEFAULT_SHARING);
  const [partnerCode, setPartnerCode] = useState('');
  const [showInviteQr, setShowInviteQr] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const { connectPartner, disconnectPartner } = usePartnerConnection();

  const isMale = variant === 'male';
  const dashboardPath = isMale ? '/male-dashboard' : '/female-dashboard';
  const pageGradient = isMale ? 'from-sky-50 via-white to-blue-50' : 'from-pink-50 via-white to-sky-50';
  const accentText = isMale ? 'text-blue-600' : 'text-pink-500';
  const hasPartner = Boolean(user?.partnerId);
  const hasCouplePremium = subscriptionQuery.data?.couplePremium === true;

  const settingsQuery = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => api.get('/users/notification-settings').then(({ data }) => data.settings as Partial<NotificationSettings>),
  });

  const sharingQuery = useQuery({
    queryKey: ['partner-sharing-preferences'],
    queryFn: () => api.get('/users/partner-sharing-preferences')
      .then(({ data }) => data.sharing as Partial<PartnerSharingSettings>),
    enabled: !isMale,
  });

  const partnerQuery = useQuery({
    queryKey: ['partner-cycles', 'settings'],
    queryFn: () => api.get('/users/partner-cycles').then(({ data }) => data as PartnerCyclesResponse),
    enabled: hasPartner,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      const next = { ...DEFAULT_SETTINGS, ...settingsQuery.data, smsEnabled: false };
      if (!hasCouplePremium) {
        next.dailyQuestionsEnabled = false;
        next.contextualCareSuggestionsEnabled = false;
        next.partnerCareTipsEnabled = false;
        next.partnerEndOfDayNudgeEnabled = false;
      }
      setSettings(next);
    }
  }, [hasCouplePremium, settingsQuery.data]);

  useEffect(() => {
    if (sharingQuery.data) {
      setSharing({ ...DEFAULT_SHARING, ...sharingQuery.data });
    }
  }, [sharingQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/users/notification-settings', { ...settings, smsEnabled: false }),
    onSuccess: ({ data }) => {
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings, smsEnabled: false });
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['chat'] });
      toast.success('Đã lưu cài đặt thông báo & AI');
    },
    onError: () => toast.error('Lưu cài đặt thất bại, thử lại sau nhé'),
  });

  const saveSharingMutation = useMutation({
    mutationFn: () => api.put('/users/partner-sharing-preferences', sharing),
    onSuccess: ({ data }) => {
      setSharing({ ...DEFAULT_SHARING, ...data.sharing });
      queryClient.invalidateQueries({ queryKey: ['partner-sharing-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['partner-cycles'] });
      toast.success('Đã lưu quyền chia sẻ với Người ấy');
    },
    onError: () => toast.error('Không thể lưu quyền chia sẻ lúc này'),
  });

  const rows = useMemo(() => [
    {
      key: 'periodUpcomingEnabled' as const,
      title: 'Dự đoán kỳ sắp tới',
      desc: 'Nhắc trước kỳ dự kiến theo số ngày bạn chọn.',
    },
    {
      key: 'fertilityWindowEnabled' as const,
      title: 'Cửa sổ thụ thai & rụng trứng',
      desc: 'Thông báo những ngày khả năng thụ thai ước tính cao.',
    },
    {
      key: 'dailyHealthTipsEnabled' as const,
      title: 'Lời khuyên sức khỏe hằng ngày',
      desc: 'Một lời hỏi thăm nhỏ mỗi sáng để chăm sóc bản thân đều hơn.',
    },
    {
      key: 'symptomDailyReminderEnabled' as const,
      title: 'Nhắc ghi triệu chứng trong kỳ',
      desc: 'Gửi web/email theo giờ bạn chọn nếu hôm nay chưa ghi nhật ký.',
      hot: true,
    },
    {
      key: 'dailyQuestionsEnabled' as const,
      title: 'Câu hỏi hằng ngày của chúng mình',
      desc: 'Nhận một câu hỏi chung mỗi ngày và mở câu trả lời khi cả hai đã hoàn thành.',
      hot: true,
      premium: true,
    },
    {
      key: 'contextualCareSuggestionsEnabled' as const,
      title: 'Gợi ý theo chu kỳ và tâm trạng',
      desc: 'Dùng dữ liệu được chia sẻ để gợi ý cách quan tâm phù hợp theo ngữ cảnh.',
      premium: true,
    },
    {
      key: 'partnerPeriodAlertEnabled' as const,
      title: 'Báo tin kỳ cho Người ấy',
      desc: 'Cho phép Hi nhắc Người ấy khi bạn sắp tới kỳ, nếu hai bạn đã kết nối.',
    },
    {
      key: 'partnerMoodUpdatesEnabled' as const,
      title: 'Cập nhật tâm trạng',
      desc: 'Gửi cảm xúc nhanh đã chọn sang Người ấy bằng thông báo trong app.',
    },
    {
      key: 'partnerCareTipsEnabled' as const,
      title: 'Gợi ý chăm sóc',
      desc: 'Gợi ý những hành động nhẹ nhàng để Người ấy biết cách quan tâm đúng lúc.',
      premium: true,
    },
    {
      key: 'partnerEndOfDayNudgeEnabled' as const,
      title: 'Nhắc cuối ngày cho cả hai',
      desc: 'Nếu bạn nữ gần/tới kỳ mà chưa cập nhật, Hi nhắc cả hai bằng lời nhẹ nhàng.',
      premium: true,
    },
  ], []);

  const update = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const dailyPartnerCode = buildDailyPartnerCode(user?.partnerCode) || user?.partnerCode || '';
  const dailyPartnerInviteUrl = dailyPartnerCode ? buildPartnerInviteUrl(dailyPartnerCode) : '';

  const copyCode = async () => {
    if (!dailyPartnerCode) return;
    await navigator.clipboard.writeText(dailyPartnerCode);
    toast.success('Đã sao chép mã mời');
  };

  const submitPartnerCode = () => {
    if (!partnerCode.trim()) {
      toast.error('Nhập mã mời của Người ấy trước nhé');
      return;
    }
    connectPartner.mutate(partnerCode);
  };

  const scanQrImage = async (file?: File) => {
    if (!file) return;
    if (!('BarcodeDetector' in window)) {
      toast.error('Trình duyệt này chưa hỗ trợ quét QR từ ảnh. Bạn nhập mã chữ bên dưới nhé.');
      return;
    }

    try {
      const Detector = (window as typeof window & {
        BarcodeDetector: new (options: { formats: string[] }) => {
          detect: (source: ImageBitmap) => Promise<Array<{ rawValue?: string }>>;
        };
      }).BarcodeDetector;
      const bitmap = await createImageBitmap(file);
      const detector = new Detector({ formats: ['qr_code'] });
      const codes = await detector.detect(bitmap);
      bitmap.close();
      const rawValue = codes[0]?.rawValue?.trim();
      if (!rawValue) {
        toast.error('Chưa nhận diện được QR. Bạn thử ảnh rõ hơn hoặc nhập mã chữ.');
        return;
      }
      const normalizedCode = normalizePartnerInviteCode(rawValue);
      setPartnerCode(normalizedCode);
      toast.success('Đã nhận mã QR, bấm Kết nối để hoàn tất');
    } catch {
      toast.error('Không quét được QR từ ảnh này. Bạn thử ảnh khác hoặc nhập mã chữ.');
    }
  };

  const ownName = user?.name || 'Bạn';
  const partnerName = partnerQuery.data?.partner?.name || 'Người ấy';

  // Define settings card sub-elements to avoid duplicate code and support clean separate layouts
  const privacyCard = !isMale ? (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-pink-500 text-3xl">lock</span>
          <h2 className="text-xl font-black text-slate-900">Quyền riêng tư với Người ấy</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500 mb-5 leading-relaxed">
          Các quyền mặc định đều tắt. Chỉ tài khoản đang kết nối mới xem được dữ liệu đã cho phép.
        </p>
        
        <div className="divide-y divide-slate-100/60 border-t border-slate-100/60">
          <SettingRow
            title="Chia sẻ chu kỳ"
            desc="Cho Người ấy xem lịch sử chu kỳ và dự đoán."
            checked={sharing.shareCycleData}
            onChange={(value) => setSharing((current) => ({ ...current, shareCycleData: value }))}
            accent={variant}
          />
          <SettingRow
            title="Chia sẻ cảm xúc"
            desc="Cho Người ấy xem cảm xúc gần nhất mà bạn đã ghi."
            checked={sharing.shareMood}
            onChange={(value) => setSharing((current) => ({ ...current, shareMood: value }))}
            accent={variant}
          />
          <SettingRow
            title="Chia sẻ triệu chứng"
            desc="Cho gợi ý chăm sóc dùng triệu chứng của bạn."
            checked={sharing.shareDetailedSymptoms}
            onChange={(value) => setSharing((current) => ({ ...current, shareDetailedSymptoms: value }))}
            accent={variant}
          />
          <SettingRow
            title="Chia sẻ ghi chú"
            desc="Cho gợi ý chăm sóc dùng ghi chú sức khỏe."
            checked={sharing.shareHealthNotes}
            onChange={(value) => setSharing((current) => ({ ...current, shareHealthNotes: value }))}
            accent={variant}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => saveSharingMutation.mutate()}
        disabled={saveSharingMutation.isPending || sharingQuery.isLoading}
        className="hi-btn-secondary w-full rounded-xl py-3 text-xs font-black mt-6 min-h-[44px]"
      >
        {saveSharingMutation.isPending ? 'Đang lưu...' : 'Lưu quyền chia sẻ'}
      </button>
    </div>
  ) : null;

  const channelsCard = (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-violet-500 text-3xl">notifications</span>
          <h2 className="text-xl font-black text-slate-900">Kênh thông báo</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500 mb-5 leading-relaxed">
          Bật/tắt các kênh nhận tin nhắn từ Hi. SMS hiện chưa hỗ trợ trong MVP.
        </p>
        <div className="grid gap-3 mb-5">
          <ChannelButton label="Push App" icon="notifications_active" active={settings.pushEnabled} onClick={() => update('pushEnabled', !settings.pushEnabled)} accent={variant} />
          <ChannelButton label="Email" icon="mail" active={settings.emailEnabled} onClick={() => update('emailEnabled', !settings.emailEnabled)} accent={variant} />
          <ChannelButton label="SMS" icon="sms" active={false} disabled onClick={() => undefined} accent={variant} />
        </div>

        {/* Phân loại các cài đặt liên quan tới gửi mail lại với nhau, thiết kế gọn gàng */}
        {settings.emailEnabled && (
          <div className="border-t border-slate-200/60 pt-4 space-y-3">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Email câu hỏi cặp đôi</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5 leading-relaxed">
                Cấu hình nhận email khi người ấy tương tác.
              </p>
            </div>
            
            <div className="divide-y divide-slate-100/60 border-t border-slate-100/60">
              <SettingRow
                title="Người ấy trả lời"
                desc="Khi đối tác gửi câu trả lời lần đầu."
                checked={settings.coupleQuestionAnswerEmailEnabled}
                onChange={(value) => update('coupleQuestionAnswerEmailEnabled', value)}
                accent={variant}
              />
              <SettingRow
                title="Người ấy chỉnh sửa"
                desc="Khi đối tác sửa câu trả lời của họ."
                checked={settings.coupleQuestionEditEmailEnabled}
                onChange={(value) => update('coupleQuestionEditEmailEnabled', value)}
                accent={variant}
              />
              <SettingRow
                title="Người ấy bình luận"
                desc="Khi đối tác gửi bình luận/tin nhắn."
                checked={settings.coupleQuestionCommentEmailEnabled}
                onChange={(value) => update('coupleQuestionCommentEmailEnabled', value)}
                accent={variant}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const remindersCard = (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-pink-500 text-3xl">calendar_today</span>
          <h2 className="text-xl font-black text-slate-900">{isMale ? 'Nhắc chăm sóc & Sức khỏe' : 'Nhắc chu kỳ & Sức khỏe'}</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500 mb-4 leading-relaxed">
          {isMale ? 'Nhận gợi ý chăm sóc và nhắc nhở phù hợp với dữ liệu Người ấy đã chia sẻ.' : 'Nhận nhắc nhở hữu ích về chu kỳ và lời khuyên chăm sóc sức khỏe.'}
        </p>
        <div className="divide-y divide-slate-100/60 border-t border-slate-100/60">
          {rows
            .filter((row) => row.key !== 'dailyQuestionsEnabled')
            .filter((row) => !isMale || !['periodUpcomingEnabled', 'fertilityWindowEnabled', 'symptomDailyReminderEnabled'].includes(row.key))
            .map((row) => (
            <SettingRow
              key={row.key}
              title={row.title}
              desc={row.desc}
              checked={Boolean(settings[row.key])}
              onChange={(value) => update(row.key, value)}
              accent={variant}
              hot={row.hot}
              premium={row.premium}
              disabled={row.premium && !hasCouplePremium}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const reminderTimesCard = (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-rose-500 text-3xl">alarm</span>
          <h2 className="text-xl font-black text-slate-900">Giờ nhắc nhở</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500 mb-4 leading-relaxed">
          Thiết lập thời gian nhận thông báo nhắc nhở trong ngày.
        </p>
        <div className="grid gap-4 border-t border-slate-100/60 pt-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-1">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Nhắc trước kỳ</span>
            <select
              value={settings.reminderDaysBefore}
              onChange={(event) => update('reminderDaysBefore', Number(event.target.value))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-100 min-h-[44px]"
            >
              {[1, 2, 3, 5, 7].map((day) => <option key={day} value={day}>{day} ngày trước</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Giờ nhắc ghi triệu chứng</span>
            <input type="time" value={settings.symptomReminderTime} onChange={(event) => update('symptomReminderTime', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-pink-300 min-h-[44px]" />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Giờ nhắc cuối ngày cặp đôi</span>
            <input type="time" value={settings.partnerNudgeTime} disabled={!hasCouplePremium} onChange={(event) => update('partnerNudgeTime', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-pink-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 min-h-[44px]" />
          </label>
        </div>
      </div>
    </div>
  );

  const aiStyleCard = (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-sky-500 text-3xl">auto_awesome</span>
          <h2 className="text-xl font-black text-slate-900">Phong cách Hi AI</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500 mb-4 leading-relaxed">
          Chọn tông giọng phản hồi ưa thích của trợ lý Hi AI.
        </p>
        <div className="grid gap-2 border-t border-slate-100 pt-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-5">
          {aiStyles.map((style) => {
            const active = settings.aiResponseStyle === style.value;
            return (
              <button
                type="button"
                key={style.value}
                onClick={() => update('aiResponseStyle', style.value)}
                className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? (isMale ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-rose-200 bg-rose-50 text-rose-600')
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-black">{style.label}</p>
                <p className={`mt-1 text-[11px] font-semibold leading-relaxed ${active ? (isMale ? 'text-sky-600/75' : 'text-rose-600/75') : 'text-slate-400'}`}>{style.desc}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-400">
          Lưu cài đặt để Hi AI dùng phong cách này trong các câu trả lời sau.
        </p>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br ${pageGradient} font-sans text-slate-900 pb-16`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={`absolute -left-28 top-10 h-96 w-96 rounded-full blur-3xl ${isMale ? 'bg-sky-200/50' : 'bg-pink-200/50'}`} />
        <div className={`absolute -right-20 bottom-20 h-[30rem] w-[30rem] rounded-full blur-3xl ${isMale ? 'bg-blue-200/40' : 'bg-violet-200/40'}`} />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
          <nav className="mb-5 flex items-center gap-2 text-sm font-bold">
            <Link to={dashboardPath} className="text-slate-400 transition hover:text-slate-900">Tổng quan</Link>
            <span className="text-slate-300">/</span>
            <span className={accentText}>Thông báo & cặp đôi</span>
          </nav>

          {/* Connection Card Section (Original layout as shown in screenshot) */}
          <section className="mb-8 overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/85 shadow-sm backdrop-blur">
            <div className="grid gap-8 p-7 md:grid-cols-[0.95fr_1.05fr] md:p-10">
              <div className="flex items-center justify-center">
                <div>
                <div className="relative flex items-center gap-4">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-blue-200 to-violet-300 text-white shadow-xl ring-4 ring-white">
                    <span className="material-symbols-outlined text-5xl">person</span>
                  </div>
                  <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-200 to-pink-200" />
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-pink-200 to-violet-300 text-white shadow-xl ring-4 ring-white">
                    <span className="material-symbols-outlined text-5xl">person</span>
                  </div>
                  <div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white bg-white text-pink-500 shadow-lg">
                    <span className="material-symbols-outlined">favorite</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 items-start gap-3 text-center text-xs font-black text-slate-600">
                  <span className="truncate">{ownName}</span>
                  <span className="truncate">{partnerName}</span>
                </div>
                </div>
              </div>

              <div>
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${hasPartner ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  <span className={`h-2 w-2 rounded-full ${hasPartner ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {hasPartner ? 'Đã kết nối' : 'Chưa kết nối'}
                </span>
                <h1 className="hi-page-title mt-4 text-3xl md:text-[40px] md:leading-[1.08]">
                  {hasPartner ? `Đồng hành cùng ${partnerName}` : 'Kết nối với Người ấy'}
                </h1>
                <p className="mt-3 max-w-xl text-base font-semibold leading-relaxed text-slate-500">
                  Kết nối để chia sẻ thông báo chu kỳ, cảm xúc nhanh và những gợi ý chăm sóc đúng lúc. Hi chỉ chia sẻ dữ liệu bạn cho phép.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={copyCode} className="hi-btn-primary rounded-2xl px-5 py-3 text-sm font-black min-h-[44px]">
                    <span className="material-symbols-outlined mr-2 align-middle text-lg">send</span>
                    Mời Người ấy
                  </button>
                  <button type="button" onClick={() => setShowInviteQr((value) => !value)} className="hi-btn-secondary rounded-2xl px-5 py-3 text-sm font-black min-h-[44px]">
                    <span className="material-symbols-outlined mr-2 align-middle text-lg">qr_code_scanner</span>
                    {showInviteQr ? 'Ẩn mã QR' : 'Hiện mã QR'}
                  </button>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Mã mời của bạn</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-3xl font-black tracking-[0.25em] text-slate-900">{dailyPartnerCode || '---'}</p>
                    <button type="button" onClick={copyCode} className="hi-btn-secondary rounded-2xl px-4 py-2 text-xs font-black min-h-[44px]">
                      Sao chép
                    </button>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Mã hiển thị đổi mỗi ngày. Liên kết hiện tại của hai bạn không bị ảnh hưởng.
                  </p>
                  {showInviteQr && (
                    <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center">
                      <InviteQrPreview code={dailyPartnerInviteUrl || dailyPartnerCode} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900">Mã QR mời Người ấy</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                          Người ấy nhập mã hôm nay hoặc mở camera quét trên cùng màn hình. Nếu thiết bị chưa hỗ trợ quét, mã chữ vẫn dùng bình thường.
                        </p>
                        <button type="button" onClick={copyCode} className="hi-btn-secondary mt-3 rounded-xl px-4 py-2 text-xs font-black">
                          Sao chép mã hôm nay
                        </button>
                        {!hasPartner && (
                          <>
                            <input
                              ref={qrFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                void scanQrImage(event.target.files?.[0]);
                                event.currentTarget.value = '';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => qrFileInputRef.current?.click()}
                              className="hi-btn-secondary mt-2 rounded-xl px-4 py-2 text-xs font-black"
                            >
                              Quét QR từ ảnh
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {!hasPartner && (
                    <div className="mt-4 flex gap-2">
                      <input
                        value={partnerCode}
                        onChange={(event) => setPartnerCode(event.target.value.toUpperCase())}
                        placeholder="Nhập mã Người ấy"
                        className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-blue-300 bg-white"
                      />
                      <button type="button" onClick={submitPartnerCode} disabled={connectPartner.isPending} className="hi-btn-primary rounded-2xl px-4 py-3 text-sm font-black min-h-[44px]">
                        Kết nối
                      </button>
                    </div>
                  )}
                  {hasPartner && (
                    <button type="button" onClick={() => disconnectPartner.mutate()} disabled={disconnectPartner.isPending} className="hi-btn-danger mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black min-h-[44px]">
                      Ngắt kết nối
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <header className="mb-8">
            <h1 className="hi-page-title text-3xl md:text-4xl">
              Cài đặt thông báo
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Tùy chọn quyền riêng tư và cấu hình nhắc nhở của bạn.
            </p>
          </header>

          {/* 2-Column Layout for both Male & Female users */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {privacyCard}
              {channelsCard}
              {reminderTimesCard}
            </div>
            
            {/* Right Column (col-span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {remindersCard}
              {aiStyleCard}
            </div>
          </div>

          {/* Sticky/Fixed Footer styled Save Button Container */}
          <div className="mt-8 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || settingsQuery.isLoading}
              className="min-h-[48px] hi-btn-primary rounded-3xl px-8 py-3.5 text-base font-black disabled:cursor-wait"
            >
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu tất cả cài đặt'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

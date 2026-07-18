import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import HiLogo from '../components/ui/HiLogo';
import api from '../lib/api';
import { trackEvent } from '../utils/analytics';
import { getSafeNextPath } from '../lib/googleAuth';

// ─── Constants ───────────────────────────────────────────────────────────────

const INTERESTS = [
  { id: 'yoga',       label: 'Yoga & Thiền',  emoji: '🧘', color: '#f9e8f5' },
  { id: 'nutrition',  label: 'Dinh dưỡng',    emoji: '🍏', color: '#d9f5e5' },
  { id: 'sleep',      label: 'Giấc ngủ',      emoji: '🌙', color: '#ede9fe' },
  { id: 'skincare',   label: 'Skin Care',      emoji: '💧', color: '#dbeafe' },
  { id: 'psychology', label: 'Tâm lý',        emoji: '🧠', color: '#fef3c7' },
  { id: 'fitness',    label: 'Tập luyện',     emoji: '🏋️', color: '#fff0e0' },
  { id: 'reading',    label: 'Đọc sách',      emoji: '📚', color: '#e0f5ec' },
  { id: 'painting',   label: 'Hội họa',       emoji: '🎨', color: '#fce7f3' },
  { id: 'travel',     label: 'Du lịch',       emoji: '✈️',  color: '#ede9fe' },
  { id: 'gardening',  label: 'Làm vườn',      emoji: '🌱', color: '#d9f5e5' },
  { id: 'music',      label: 'Âm nhạc',       emoji: '🎵', color: '#dbeafe' },
  { id: 'cooking',    label: 'Nấu ăn',        emoji: '🍳', color: '#fce7f3' },
];

const GOALS = [
  { id: 'track_cycle', label: 'Theo dõi chu kỳ',    desc: 'Dự đoán kỳ kinh tiếp theo',    emoji: '💧', bg: '#fce7f3', accent: '#f472b6' },
  { id: 'conceive',    label: 'Mong muốn thụ thai', desc: 'Xác định ngày rụng trứng',      emoji: '💙', bg: '#dbeafe', accent: '#60a5fa' },
  { id: 'pregnancy',   label: 'Theo dõi thai kỳ',   desc: 'Theo dõi sự phát triển của bé', emoji: '👶', bg: '#fef9c3', accent: '#fbbf24' },
  { id: 'menopause',   label: 'Tiền mãn kinh',       desc: 'Quản lý các triệu chứng',       emoji: '⏳', bg: '#ede9fe', accent: '#a78bfa' },
];

const GOALS_MALE = [
  { id: 'partner_health', label: 'Sức khỏe người ấy',      desc: 'Theo dõi chu kỳ của bạn gái',       emoji: '💑', bg: '#fce7f3', accent: '#f472b6' },
  { id: 'understand',     label: 'Tìm hiểu kinh nguyệt',   desc: 'Hiểu hơn về sức khỏe phụ nữ',       emoji: '📖', bg: '#dbeafe', accent: '#60a5fa' },
  { id: 'support',        label: 'Đồng hành & quan tâm',   desc: 'Nhắc nhở, hỗ trợ đúng lúc',         emoji: '🤝', bg: '#d9f5e5', accent: '#34d399' },
  { id: 'conceive_male',  label: 'Muốn có em bé',          desc: 'Tối ưu thời điểm thụ thai',          emoji: '👶', bg: '#fef9c3', accent: '#fbbf24' },
];

const MONTHS_VN = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                   'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const DAYS_VN = ['T2','T3','T4','T5','T6','T7','CN'];

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Thiếu cân',    color: '#3b82f6' };
  if (bmi < 25)   return { label: 'Bình thường',  color: '#22c55e' };
  if (bmi < 30)   return { label: 'Thừa cân',     color: '#f59e0b' };
  return           { label: 'Béo phì',            color: '#ef4444' };
}

function getFirstDayMon(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0
  const [gender, setGender] = useState<'female' | 'male' | ''>('');
  // Step 1
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  // Step 2
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  // Step 3
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [irregularCycle, setIrregularCycle] = useState(false);
  const [periodReminder, setPeriodReminder] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [partnerNotifications, setPartnerNotifications] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');   // start date
  const [endDate, setEndDate] = useState('');              // end date
  // Calendar nav
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // female: 0→1→2→3→4  |  male: 0→1→2→4 (skip 3)
  const totalSteps = gender === 'male' ? 4 : 5;
  const displayStepNum = step === 4 && gender === 'male' ? 4 : step + 1;
  const progressPct = Math.min((displayStepNum / totalSteps) * 100, 100);

  const bmi = useMemo(() => {
    const h = parseFloat(height), w = parseFloat(weight);
    if (!h || !w || h <= 0) return null;
    return w / ((h / 100) ** 2);
  }, [height, weight]);
  const bmiInfo = bmi ? bmiCategory(bmi) : null;

  const calendarGrid = useMemo(() => {
    const total = getDaysInMonth(calYear, calMonth);
    const first = getFirstDayMon(calYear, calMonth);
    const cells: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  const toDateStr = (day: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const handleNext = () => {
    if (step === 2 && gender === 'male') setStep(4);
    else setStep(s => s + 1);
  };
  const handleBack = () => {
    if (step === 4 && gender === 'male') setStep(2);
    else setStep(s => s - 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        gender,
        interests: selectedInterests,
        goals: selectedGoals,
        height: height ? Number(height) : undefined,
        weight: weight ? Number(weight) : undefined,
        onboardingCompleted: true,
      };

      if (gender === 'female') {
        payload.defaultCycleLength = cycleLength;
        payload.defaultPeriodLength = periodLength;
        payload.lastPeriodDate = selectedDate || undefined;
        payload.lastPeriodEndDate = endDate || undefined;
        payload.irregularCycle = irregularCycle;
        payload.periodReminder = periodReminder;
        payload.reminderDaysBefore = reminderDaysBefore;
      } else if (gender === 'male') {
        payload.partnerNotifications = partnerNotifications;
      }

      const { data } = await api.put('/users/profile', payload);
      setUser(data.user);
      trackEvent('ONBOARDING_COMPLETE', 'onboarding_page');
      toast.success('Thiết lập hoàn tất! Chào mừng bạn 🎉');
      navigate(getSafeNextPath(location.search, '/dashboard'));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared style tokens ──
  const gradBtn = {
    background: 'linear-gradient(135deg, #9b6ee8, #c9a8e0, #f9a8c9)',
    boxShadow: '0 8px 24px rgba(155,110,232,0.35)',
  } as const;

  return (
    <div
      className="auth-shell min-h-screen relative overflow-x-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", background: '#f5f0fc' }}
    >
      <div className="auth-ambient-effect contents" aria-hidden="true">
      {/* ─── Background blobs ───────────────────────────────── */}
      <div className="absolute pointer-events-none" style={{ width: 520, height: 520, borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%', background: 'radial-gradient(circle at 40% 40%, #c9e8f8 0%, #b8d4f5 50%, transparent 80%)', top: '-150px', left: '-120px', animation: 'morphBlob1 12s ease-in-out infinite', opacity: 0.65, filter: 'blur(55px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 480, height: 480, borderRadius: '40% 60% 30% 70% / 60% 40% 70% 30%', background: 'radial-gradient(circle at 60% 60%, #f9c2db 0%, #f4a8cb 55%, transparent 80%)', bottom: '-150px', right: '-100px', animation: 'morphBlob2 14s ease-in-out infinite 2s', opacity: 0.60, filter: 'blur(55px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 340, height: 340, borderRadius: '50% 50% 40% 60% / 40% 60% 50% 50%', background: 'radial-gradient(circle at 50% 50%, #ddb8f0 0%, #c8a8e8 60%, transparent 80%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'morphBlob3 16s ease-in-out infinite 1s', opacity: 0.40, filter: 'blur(50px)' }} />

      </div>

      {/* ─── Top bar ─────────────────────────────────────────── */}
      <div className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <HiLogo size={34} />
          <span className="text-lg font-black tracking-tight" style={{ background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Hi Lover
          </span>
        </div>
        {step < 4 && (
          <div data-guide="onboarding-progress" className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">Bước {displayStepNum} trên {totalSteps}</span>
            <div className="w-28 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #7ecae8, #c9a8e0, #f9a8c9)' }} />
            </div>
          </div>
        )}
      </div>

      {/* ─── Page content ────────────────────────────────────── */}
      <div data-guide="onboarding-content" className="relative z-10 flex flex-col items-center px-4 pb-16 pt-2">

        {/* ══════════════ STEP 0: GENDER ══════════════ */}
        {step === 0 && (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-10">
              <h1 className="hi-page-title text-4xl sm:text-5xl mb-2">Chào mừng bạn!</h1>
              <h2 className="hi-page-title text-3xl sm:text-4xl mb-4">Bạn là ai?</h2>
              <p className="text-gray-500 text-base">Chọn giới tính để chúng tôi tối ưu hóa trải nghiệm theo dõi sức khỏe của bạn.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-10">
              {([
                { value: 'female' as const, label: 'Nữ',  sub: 'Theo dõi chu kỳ & sức khỏe', emoji: '👩', bg: 'linear-gradient(145deg, #fce7f3, #f9cfea)' },
                { value: 'male'   as const, label: 'Nam', sub: 'Đồng hành & Theo dõi',        emoji: '👨', bg: 'linear-gradient(145deg, #dbeafe, #c7d9f8)' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value)}
                  className="relative flex flex-col items-center rounded-3xl p-4 sm:p-6 bg-white transition-all duration-300"
                  style={{
                    boxShadow: gender === opt.value ? '0 0 0 2.5px #9b6ee8, 0 12px 30px rgba(155,110,232,0.20)' : '0 4px 20px rgba(0,0,0,0.07)',
                    transform: gender === opt.value ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  {gender === opt.value && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#9b6ee8' }}>
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                  <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl mb-4 flex items-center justify-center text-4xl sm:text-6xl flex-shrink-0" style={{ background: opt.bg }}>
                    {opt.emoji}
                  </div>
                  <span className="text-sm sm:text-base font-bold text-gray-900 mb-1">{opt.label}</span>
                  <span className="text-[10px] sm:text-xs text-gray-500 text-center leading-snug">{opt.sub}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <button onClick={handleNext} disabled={!gender} className="hi-btn-primary h-13 rounded-full text-sm font-bold flex items-center gap-2 px-12" style={{ height: 52 }}>
                Tiếp tục <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 1: INTERESTS ══════════════ */}
        {step === 1 && (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="hi-page-title text-3xl sm:text-4xl mb-3">Sở thích của bạn là gì?</h1>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">Chọn những chủ đề bạn quan tâm để chúng tôi cá nhân hóa lời khuyên và bài viết dành riêng cho bạn.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
              {INTERESTS.map(item => {
                const sel = selectedInterests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedInterests(prev => sel ? prev.filter(x => x !== item.id) : [...prev, item.id])}
                    className="relative flex flex-col items-center justify-center rounded-2xl py-5 px-2 transition-all duration-200"
                    style={{ background: item.color, boxShadow: sel ? '0 0 0 2px #9b6ee8' : 'none', transform: sel ? 'scale(1.04)' : 'scale(1)' }}
                  >
                    {sel && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#9b6ee8' }}>
                        <span className="text-white text-[10px] font-bold">✓</span>
                      </div>
                    )}
                    <span className="text-2xl mb-2">{item.emoji}</span>
                    <span className={`text-xs font-semibold text-center leading-tight ${sel ? 'text-purple-700' : 'text-gray-700'}`}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-3">
              <button onClick={handleNext} className="hi-btn-primary h-13 rounded-full text-sm font-bold flex items-center gap-2 px-12" style={{ height: 52 }}>
                Tiếp theo <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
              <button onClick={handleNext} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Bỏ qua bước này</button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 2: GOALS ══════════════ */}
        {step === 2 && (
          <div className="w-full max-w-xl">
            <div className="text-center mb-8">
              <h1 className="hi-page-title text-3xl sm:text-4xl mb-3">
                {gender === 'male' ? <>Bạn muốn Hi giúp gì<br />cho bạn?</> : <>Bạn muốn Hi hỗ trợ<br />điều gì nhất?</>}
              </h1>
              <p className="text-gray-500 text-sm">Hi sẽ tuỳ chỉnh giao diện và lời khuyên dựa trên lựa chọn này.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {(gender === 'male' ? GOALS_MALE : GOALS).map(goal => {
                const sel = selectedGoals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoals(prev => prev.includes(goal.id) ? prev.filter(x => x !== goal.id) : [...prev, goal.id])}
                    className="flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 text-left"
                    style={{
                      background: sel ? goal.bg : 'white',
                      boxShadow: sel ? `0 0 0 2px ${goal.accent}, 0 8px 20px rgba(0,0,0,0.08)` : '0 2px 12px rgba(0,0,0,0.06)',
                      transform: sel ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: goal.bg }}>
                      {goal.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-snug">{goal.label}</p>
                      <p className="text-xs text-gray-500 leading-snug mt-0.5">{goal.desc}</p>
                    </div>
                    {sel && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: goal.accent }}>
                        <span className="text-white text-[10px] font-bold">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {gender === 'male' && (
              <button
                onClick={() => setPartnerNotifications(v => !v)}
                className="w-full mb-7 flex items-center justify-between px-4 py-3 rounded-2xl transition-all bg-white"
                style={{ boxShadow: partnerNotifications ? '0 0 0 2px #60a5fa, 0 8px 20px rgba(96,165,250,0.2)' : '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <span className="text-lg">🔔</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Nhận nhắc chăm sóc người ấy</p>
                    <p className="text-[10px] text-gray-500">Hi sẽ gửi nhắc nhở phù hợp theo chu kỳ đối tác</p>
                  </div>
                </div>
                <div
                  className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-300"
                  style={{ background: partnerNotifications ? '#60a5fa' : '#d1d5db' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                    style={{ left: partnerNotifications ? 22 : 2 }}
                  />
                </div>
              </button>
            )}

            <div className="flex justify-center">
              <button onClick={handleNext} disabled={selectedGoals.length === 0} className="hi-btn-primary rounded-full text-sm font-bold flex items-center gap-2 px-12" style={{ height: 52 }}>
                Tiếp tục <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 3: CYCLE + BMI (female) ══════════════ */}
        {step === 3 && (
          <div className="w-full max-w-3xl">
            <div className="mb-7">
              <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#f472b6' }}>BƯỚC 4/5</div>
              <h1 className="hi-page-title text-3xl mb-1">Thiết lập Chu kỳ của bạn</h1>
              <p className="text-gray-500 text-sm max-w-md">Để AI dự đoán chính xác, hãy cho chúng tôi biết ngày đầu tiên của kỳ kinh gần nhất.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-7">
              {/* ── Calendar ── */}
              <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-lg" style={{ color: '#f472b6' }}>calendar_month</span>
                  <span className="text-sm font-bold text-gray-800">Kỳ kinh gần nhất</span>
                </div>
                {/* Hint text */}
                <p className="text-xs text-gray-400 mb-3">
                  {!selectedDate ? 'Chọn ngày bắt đầu kỳ kinh' : !endDate ? 'Chọn ngày kết thúc' : `${selectedDate.slice(8)}/${selectedDate.slice(5,7)} → ${endDate.slice(8)}/${endDate.slice(5,7)}`}
                </p>
                {/* Month header */}
                <div className="flex items-center justify-between mb-3">
                  <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 text-lg font-bold">‹</button>
                  <span className="text-sm font-bold text-gray-800">{MONTHS_VN[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 text-lg font-bold">›</button>
                </div>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_VN.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>)}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {calendarGrid.map((day, idx) => {
                    const dateStr = day ? toDateStr(day) : '';
                    const isFuture = !!day && new Date(calYear, calMonth, day) > now;
                    const isStart   = !!day && dateStr === selectedDate;
                    const isEnd     = !!day && !!endDate && dateStr === endDate;
                    const isInRange = !!day && !!selectedDate && !!endDate
                      && dateStr > selectedDate && dateStr < endDate;

                    let cellStyle: React.CSSProperties = {};
                    let cellClass = 'aspect-square h-auto w-full flex items-center justify-center text-xs rounded-full transition-all duration-150 ';

                    if (!day) {
                      // empty
                    } else if (isFuture) {
                      cellClass += 'text-gray-300 cursor-not-allowed';
                    } else if (isStart) {
                      cellStyle = { background: 'linear-gradient(135deg, #f472b6, #a78bfa)' };
                      cellClass += 'text-white font-bold';
                    } else if (isEnd) {
                      cellStyle = { background: 'linear-gradient(135deg, #a78bfa, #9b6ee8)' };
                      cellClass += 'text-white font-bold';
                    } else if (isInRange) {
                      cellStyle = { background: 'rgba(244,114,182,0.18)', color: '#f472b6' };
                      cellClass += 'font-medium';
                    } else {
                      cellClass += 'hover:bg-pink-50 text-gray-700 cursor-pointer';
                    }

                    return (
                      <button
                        key={idx}
                        disabled={!day || isFuture}
                        onClick={() => {
                          if (!day || isFuture) return;
                          const ds = toDateStr(day);
                          // If nothing selected yet → set start
                          if (!selectedDate) { setSelectedDate(ds); return; }
                          // If only start selected
                          if (!endDate) {
                            if (ds > selectedDate) { setEndDate(ds); return; }
                            // clicked same or before → reset start
                            setSelectedDate(ds);
                            return;
                          }
                          // Both set → reset to new start
                          setSelectedDate(ds);
                          setEndDate('');
                        }}
                        className={cellClass}
                        style={cellStyle}
                      >
                        {day ?? ''}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { setSelectedDate(''); setEndDate(''); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm" style={{ color: '#f472b6' }}>help_outline</span>
                    Tôi không nhớ
                  </button>
                  {(selectedDate || endDate) && (
                    <button
                      onClick={() => { setSelectedDate(''); setEndDate(''); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-red-100 text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      Xóa lựa chọn
                    </button>
                  )}
                </div>
              </div>

              {/* ── Slider + BMI ── */}
              <div className="flex flex-col gap-4">
                {/* Cycle length */}
                <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-lg" style={{ color: '#f472b6' }}>timer</span>
                    <span className="text-sm font-bold text-gray-800">Chu kỳ thường kéo dài?</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Kéo thanh trượt để chọn số ngày trung bình.</p>
                  <div className="text-center mb-3">
                    <span className="text-4xl font-black" style={{ color: '#f472b6' }}>{cycleLength}</span>
                    <span className="text-sm font-semibold text-gray-500 ml-1">ngày</span>
                  </div>
                  <input type="range" min={20} max={45} value={cycleLength} onChange={e => setCycleLength(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: '#f472b6' }} />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>20 ngày</span><span>45 ngày</span></div>
                  <div className="mt-3 p-2.5 rounded-xl text-xs text-gray-500 leading-relaxed" style={{ background: '#fff0f7' }}>
                    💡 Chu kỳ bình thường dao động từ 21 đến 35 ngày. Đừng lo nếu bạn không chắc chắn, bạn có thể chỉnh sửa sau.
                  </div>

                  <div className="mt-4 pt-3 border-t border-pink-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700">Độ dài kỳ kinh</span>
                      <span className="text-sm font-black" style={{ color: '#9b6ee8' }}>{periodLength} ngày</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      value={periodLength}
                      onChange={e => setPeriodLength(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: '#a78bfa' }}
                    />
                  </div>

                  {/* Irregular cycle toggle */}
                  <button
                    onClick={() => setIrregularCycle(v => !v)}
                    className="mt-3 w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                    style={{
                      background: irregularCycle ? 'linear-gradient(135deg,#fce7f3,#ede9fe)' : '#f8f8fc',
                      boxShadow: irregularCycle ? '0 0 0 2px #f472b6' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🔀</span>
                      <div className="text-left">
                        <p className="text-xs font-bold text-gray-800">Chu kỳ không đều</p>
                        <p className="text-[10px] text-gray-500 leading-snug">Bật nếu độ dài chu kỳ thay đổi mỗi tháng</p>
                      </div>
                    </div>
                    {/* Toggle pill */}
                    <div
                      className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-300"
                      style={{ background: irregularCycle ? '#f472b6' : '#d1d5db' }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                        style={{ left: irregularCycle ? 22 : 2 }}
                      />
                    </div>
                  </button>

                  <button
                    onClick={() => setPeriodReminder(v => !v)}
                    className="mt-3 w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                    style={{
                      background: periodReminder ? 'linear-gradient(135deg,#fce7f3,#ede9fe)' : '#f8f8fc',
                      boxShadow: periodReminder ? '0 0 0 2px #a78bfa' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <span className="text-lg">⏰</span>
                      <div>
                        <p className="text-xs font-bold text-gray-800">Nhắc trước kỳ kinh</p>
                        <p className="text-[10px] text-gray-500 leading-snug">Bật để nhận nhắc trước khi kỳ kinh tới</p>
                      </div>
                    </div>
                    <div
                      className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-300"
                      style={{ background: periodReminder ? '#a78bfa' : '#d1d5db' }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                        style={{ left: periodReminder ? 22 : 2 }}
                      />
                    </div>
                  </button>

                  {periodReminder && (
                    <div className="mt-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                      <label className="text-xs font-bold text-violet-700">Nhắc trước bao nhiêu ngày</label>
                      <div className="mt-2 flex items-center gap-2">
                        {[1, 2, 3, 5].map((days) => (
                          <button
                            key={days}
                            onClick={() => setReminderDaysBefore(days)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                            style={{
                              background: reminderDaysBefore === days ? '#8b5cf6' : 'white',
                              color: reminderDaysBefore === days ? 'white' : '#6b7280',
                              boxShadow: reminderDaysBefore === days ? '0 6px 14px rgba(139,92,246,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                            }}
                          >
                            {days} ngày
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* BMI */}
                <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-lg" style={{ color: '#9b6ee8' }}>monitor_weight</span>
                    <span className="text-sm font-bold text-gray-800">Tính chỉ số BMI</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">Chiều cao (cm)</label>
                      <input type="number" placeholder="160" value={height} onChange={e => setHeight(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">Cân nặng (kg)</label>
                      <input type="number" placeholder="55" value={weight} onChange={e => setWeight(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-50" />
                    </div>
                  </div>
                  {bmi && bmiInfo ? (
                    <div className="p-3 rounded-xl text-center transition-all" style={{ background: `${bmiInfo.color}18` }}>
                      <span className="text-2xl font-black" style={{ color: bmiInfo.color }}>{bmi.toFixed(1)}</span>
                      <span className="text-xs font-bold ml-2" style={{ color: bmiInfo.color }}>{bmiInfo.label}</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl text-center text-xs text-gray-400" style={{ background: '#f8f8fc' }}>
                      Nhập chiều cao và cân nặng để tính BMI
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button onClick={handleNext} className="rounded-full text-white text-sm font-bold flex items-center gap-2 transition-all"
                style={{ background: 'linear-gradient(135deg, #f472b6, #c084fc)', boxShadow: '0 8px 24px rgba(244,114,182,0.35)', height: 52, paddingLeft: 48, paddingRight: 48 }}>
                Hoàn tất bước này <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 4: COMPLETE ══════════════ */}
        {step === 4 && (
          <div className="w-full max-w-md text-center">
            <div className="text-7xl mb-5" style={{ animation: 'bounceIn 0.6s ease both' }}>🎉</div>
            <h1 className="hi-page-title text-4xl mb-3">Bạn đã sẵn sàng!</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Chào mừng <span className="font-bold text-gray-800">{user?.name?.split(' ').pop() ?? 'bạn'}</span> đến với{' '}
              <span className="font-black" style={{ color: '#9b6ee8' }}>Hi Lover</span>. Hành trình sức khỏe của bạn bắt đầu từ đây. 💕
            </p>

            {/* Summary card */}
            <div className="bg-white rounded-3xl p-6 mb-8 text-left space-y-4" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
              {[
                { bg: '#f9e8f5', emoji: '👤', label: 'Giới tính',  value: gender === 'female' ? '👩 Nữ' : '👨 Nam', color: '' },
                { bg: '#e8f4fd', emoji: '✨', label: 'Sở thích',   value: `${selectedInterests.length} chủ đề đã chọn`, color: '' },
                { bg: '#ede9fe', emoji: '🎯', label: 'Mục tiêu',   value: selectedGoals.length > 0 ? selectedGoals.map(id => [...GOALS, ...GOALS_MALE].find(g => g.id === id)?.label).filter(Boolean).join(', ') : '—', color: '' },
                ...(gender === 'female' ? [{ bg: '#fce7f3', emoji: '💧', label: 'Chu kỳ', value: `${cycleLength} ngày · Kinh ${periodLength} ngày`, color: '' }] : []),
                ...(gender === 'female' ? [{ bg: '#f3e8ff', emoji: '⏰', label: 'Nhắc kỳ kinh', value: periodReminder ? `Bật · trước ${reminderDaysBefore} ngày` : 'Tắt', color: '' }] : []),
                ...(gender === 'male' ? [{ bg: '#dbeafe', emoji: '🔔', label: 'Nhắc chăm sóc', value: partnerNotifications ? 'Bật' : 'Tắt', color: '' }] : []),
                ...(bmi && bmiInfo ? [{ bg: '#f5f0fc', emoji: '⚖️', label: 'BMI', value: `${bmi.toFixed(1)} — ${bmiInfo.label}`, color: bmiInfo.color }] : []),
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: row.bg }}>
                    <span>{row.emoji}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{row.label}</p>
                    <p className="text-sm font-bold" style={{ color: row.color || '#111827' }}>{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleFinish}
              disabled={loading}
              className="w-full rounded-full text-white font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ ...gradBtn, height: 52 }}
            >
              {loading
                ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                : <><span>Bắt đầu ngay</span><span className="material-symbols-outlined text-xl">rocket_launch</span></>
              }
            </button>
          </div>
        )}

        {/* ── Back button ── */}
        {step > 0 && step < 4 && (
          <button onClick={handleBack} className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Quay lại bước trước
          </button>
        )}
      </div>

      <style>{`
        @keyframes morphBlob1 {
          0%,100% { transform:translate(0,0) scale(1); border-radius:60% 40% 70% 30%/50% 60% 40% 50%; }
          33%      { transform:translate(70px,45px) scale(1.10); border-radius:40% 60% 50% 50%/60% 40% 60% 40%; }
          66%      { transform:translate(-35px,65px) scale(0.92); border-radius:70% 30% 40% 60%/40% 70% 30% 60%; }
        }
        @keyframes morphBlob2 {
          0%,100% { transform:translate(0,0) scale(1); border-radius:40% 60% 30% 70%/60% 40% 70% 30%; }
          33%      { transform:translate(-60px,-45px) scale(1.08); border-radius:60% 40% 60% 40%/40% 60% 40% 60%; }
          66%      { transform:translate(45px,-65px) scale(0.95); border-radius:30% 70% 50% 50%/70% 30% 60% 40%; }
        }
        @keyframes morphBlob3 {
          0%,100% { transform:translate(-50%,-50%) scale(1); border-radius:50% 50% 40% 60%/40% 60% 50% 50%; }
          50%      { transform:translate(-50%,-50%) scale(1.20); border-radius:40% 60% 60% 40%/60% 40% 50% 50%; }
        }
        @keyframes bounceIn {
          0%   { transform:scale(0.3); opacity:0; }
          55%  { transform:scale(1.12); opacity:1; }
          100% { transform:scale(1); }
        }
      `}</style>
    </div>
  );
}

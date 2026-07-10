import { Link } from 'react-router-dom';
import HiLogo from '../components/ui/HiLogo';
import Navbar from '../components/layout/Navbar';
import {
  FREE_PLAN_FEATURES,
  PREMIUM_PLAN_FEATURES,
  PREMIUM_YEARLY_FEATURES,
} from '../config/subscriptionPlans';
import { FALLBACK_PRICING, formatPlanPrice, usePlanPricing } from '../hooks/usePlanPricing';

const REVIEWER_AVATARS = {
  minhAnh: { initials: 'MA', className: 'from-pink-100 to-sky-100 text-pink-700' },
  tuanKiet: { initials: 'TK', className: 'from-sky-100 to-violet-100 text-sky-700' },
  lanPhuong: { initials: 'LP', className: 'from-violet-100 to-rose-100 text-violet-700' },
};

const HERO_AVATARS = [
  { initials: 'H', className: 'from-pink-200 to-rose-100 text-pink-700' },
  { initials: 'L', className: 'from-sky-200 to-blue-100 text-sky-700' },
  { initials: 'V', className: 'from-violet-200 to-pink-100 text-violet-700' },
];

const HERO_IMAGE_PRIORITY = { fetchpriority: 'high' } as Record<string, string>;
const BRAND_GRADIENT_TEXT = 'bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400 bg-clip-text text-transparent';

type FeatureVisual =
  | 'cycle'
  | 'ai'
  | 'map'
  | 'question'
  | 'anniversary'
  | 'mood'
  | 'products'
  | 'connection';

const FEATURE_SHOWCASES: Array<{
  title: string;
  description: string;
  icon: string;
  visual: FeatureVisual;
  cardClass: string;
  iconClass: string;
  visualClass: string;
  delay: string;
}> = [
  {
    title: 'Theo dõi chu kỳ',
    description: 'Ghi nhận chu kỳ, dự đoán ngày quan trọng và xem lịch sức khỏe rõ ràng.',
    icon: 'calendar_month',
    visual: 'cycle',
    cardClass: 'border-pink-100 bg-pink-50/60 hover:bg-pink-50',
    iconClass: 'text-pink-500',
    visualClass: 'from-pink-100 via-white to-rose-100',
    delay: 'delay-100',
  },
  {
    title: 'AI phân tích',
    description: 'Hi AI tóm tắt xu hướng, gợi ý chăm sóc và trả lời bằng tiếng Việt.',
    icon: 'psychology',
    visual: 'ai',
    cardClass: 'border-sky-100 bg-sky-50/60 hover:bg-sky-50',
    iconClass: 'text-sky-500',
    visualClass: 'from-sky-100 via-white to-violet-100',
    delay: 'delay-200',
  },
  {
    title: 'Couple Map',
    description: 'Tìm quán ăn, cafe, điểm hẹn gần vị trí thật và lưu nơi muốn đi.',
    icon: 'map',
    visual: 'map',
    cardClass: 'border-rose-100 bg-rose-50/60 hover:bg-rose-50',
    iconClass: 'text-rose-500',
    visualClass: 'from-rose-100 via-white to-orange-100',
    delay: 'delay-300',
  },
  {
    title: 'Câu hỏi cặp đôi',
    description: 'Mỗi ngày một câu hỏi ngắn để cả hai hiểu suy nghĩ của nhau hơn.',
    icon: 'forum',
    visual: 'question',
    cardClass: 'border-violet-100 bg-violet-50/60 hover:bg-violet-50',
    iconClass: 'text-violet-500',
    visualClass: 'from-violet-100 via-white to-pink-100',
    delay: 'delay-400',
  },
  {
    title: 'Kỷ niệm & lịch chung',
    description: 'Lưu ngày bên nhau, sự kiện quan trọng và nhắc đúng thời điểm.',
    icon: 'event_heart',
    visual: 'anniversary',
    cardClass: 'border-blue-100 bg-blue-50/60 hover:bg-blue-50',
    iconClass: 'text-blue-500',
    visualClass: 'from-blue-100 via-white to-sky-100',
    delay: 'delay-100',
  },
  {
    title: 'Nhật ký cảm xúc',
    description: 'Ghi nhanh tâm trạng và gửi tín hiệu quan tâm tinh tế cho Người ấy.',
    icon: 'mood',
    visual: 'mood',
    cardClass: 'border-amber-100 bg-amber-50/60 hover:bg-amber-50',
    iconClass: 'text-amber-500',
    visualClass: 'from-amber-100 via-white to-yellow-100',
    delay: 'delay-200',
  },
  {
    title: 'Gợi ý sản phẩm',
    description: 'Khám phá sản phẩm chăm sóc phù hợp theo nhu cầu và từng giai đoạn.',
    icon: 'shopping_bag',
    visual: 'products',
    cardClass: 'border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50',
    iconClass: 'text-emerald-500',
    visualClass: 'from-emerald-100 via-white to-teal-100',
    delay: 'delay-300',
  },
  {
    title: 'Kết nối yêu thương',
    description: 'Chia sẻ dữ liệu cần thiết để người ấy chăm sóc bạn đúng lúc hơn.',
    icon: 'favorite',
    visual: 'connection',
    cardClass: 'border-purple-100 bg-purple-50/60 hover:bg-purple-50',
    iconClass: 'text-purple-500',
    visualClass: 'from-purple-100 via-white to-pink-100',
    delay: 'delay-400',
  },
];

const LANDING_PLANS = [
  {
    name: 'Đồng Hành Cơ Bản',
    displayName: 'ĐỒNG HÀNH',
    price: '0đ',
    description: 'Dành cho cặp đôi bắt đầu chăm sóc nhau mỗi ngày.',
    features: [...FREE_PLAN_FEATURES],
    to: '/register',
    cta: 'Bắt đầu miễn phí',
    highlight: false,
  },
  {
    name: 'Hi Pro',
    displayName: 'HI PRO',
    planId: 'monthly' as const,
    price: '49.000đ',
    suffix: '/tháng',
    description: 'Một người mua, cả hai cùng dùng AI và phân tích nâng cao.',
    features: [...PREMIUM_PLAN_FEATURES],
    to: '/register?plan=monthly',
    cta: 'Chọn Hi Pro',
    highlight: true,
  },
  {
    name: 'Hi Max',
    displayName: 'HI MAX',
    planId: 'yearly' as const,
    price: '399.000đ',
    suffix: '/năm',
    badge: 'Tiết kiệm 32%',
    description: 'Một người mua, cả hai dùng trọn năm với giá tiết kiệm.',
    features: [...PREMIUM_YEARLY_FEATURES],
    to: '/register?plan=yearly',
    cta: 'Chọn Hi Max',
    highlight: false,
  },
];

function FeatureMockup({ type }: { type: FeatureVisual }) {
  switch (type) {
    case 'cycle':
      return (
        <div className="grid h-full grid-cols-7 gap-1.5 p-4">
          {Array.from({ length: 21 }).map((_, index) => {
            const active = [8, 9, 10, 15].includes(index);
            return (
              <div
                key={index}
                className={`grid place-items-center rounded-lg text-[10px] font-black ${
                  active ? 'bg-pink-400 text-white shadow-sm' : 'bg-white/80 text-slate-400'
                }`}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      );
    case 'ai':
      return (
        <div className="flex h-full flex-col justify-center gap-3 p-4">
          <div className="ml-auto max-w-[76%] rounded-2xl bg-white/90 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
            Hôm nay cần chăm sóc gì?
          </div>
          <div className="max-w-[86%] rounded-2xl bg-gradient-to-r from-sky-400 to-pink-400 px-3 py-2 text-xs font-bold text-white shadow-sm">
            Nghỉ sớm hơn, uống nước ấm và theo dõi tâm trạng.
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black text-sky-600">Chu kỳ</span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black text-pink-600">Cảm xúc</span>
          </div>
        </div>
      );
    case 'map':
      return (
        <div className="relative h-full overflow-hidden p-4">
          <div className="absolute inset-0 opacity-50">
            <div className="absolute left-4 top-8 h-1 w-44 rotate-12 rounded-full bg-amber-300" />
            <div className="absolute bottom-8 right-2 h-1 w-52 -rotate-12 rounded-full bg-sky-300" />
            <div className="absolute left-12 top-4 h-32 w-1 rotate-12 rounded-full bg-white" />
            <div className="absolute right-12 top-5 h-36 w-1 -rotate-12 rounded-full bg-white" />
          </div>
          <div className="relative ml-auto w-fit rounded-2xl bg-white/90 px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
            Cafe 1.2 km
          </div>
          <div className="absolute bottom-5 left-6 rounded-2xl bg-white/95 p-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
              </span>
              <div>
                <p className="text-xs font-black text-slate-900">Điểm hẹn gần bạn</p>
                <p className="text-[10px] font-bold text-slate-400">Ăn uống • Cafe • Hẹn hò</p>
              </div>
            </div>
          </div>
        </div>
      );
    case 'question':
      return (
        <div className="flex h-full flex-col justify-center gap-3 p-4">
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-400">Câu hỏi hôm nay</p>
            <p className="mt-2 text-sm font-black leading-snug text-slate-800">Nếu tối nay rảnh, hai người muốn làm gì?</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="rounded-xl bg-emerald-100 px-3 py-2 text-center text-[10px] font-black text-emerald-700">Bạn đã trả lời</span>
            <span className="rounded-xl bg-pink-100 px-3 py-2 text-center text-[10px] font-black text-pink-700">Người ấy đã trả lời</span>
          </div>
        </div>
      );
    case 'anniversary':
      return (
        <div className="flex h-full items-center justify-center p-4">
          <div className="w-full rounded-3xl bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-500">Ngày bên nhau</p>
              <span className="material-symbols-outlined text-pink-400">favorite</span>
            </div>
            <p className="mt-2 text-4xl font-black text-slate-900">906</p>
            <div className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-600">
              Kỷ niệm tháng này • 2 sự kiện
            </div>
          </div>
        </div>
      );
    case 'mood':
      return (
        <div className="flex h-full flex-col justify-center gap-3 p-4">
          <div className="grid grid-cols-3 gap-2">
            {['Vui', 'Mệt', 'Cần ôm'].map((mood, index) => (
              <span key={mood} className={`rounded-2xl px-3 py-4 text-center text-xs font-black shadow-sm ${index === 2 ? 'bg-pink-400 text-white' : 'bg-white/90 text-slate-600'}`}>
                {mood}
              </span>
            ))}
          </div>
          <div className="rounded-2xl bg-white/90 px-3 py-3 text-xs font-bold text-slate-600 shadow-sm">
            Đã gửi tín hiệu quan tâm cho Người ấy.
          </div>
        </div>
      );
    case 'products':
      return (
        <div className="grid h-full grid-cols-2 gap-3 p-4">
          {['Vitamin', 'Chườm ấm', 'Quà nhỏ', 'Wellness'].map((item) => (
            <div key={item} className="flex flex-col justify-between rounded-2xl bg-white/90 p-3 shadow-sm">
              <span className="material-symbols-outlined text-emerald-500">shopping_bag</span>
              <p className="text-xs font-black text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      );
    case 'connection':
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-pink-300 to-rose-100 text-lg font-black text-pink-700 shadow-sm">N</span>
            <span className="material-symbols-outlined text-pink-400">favorite</span>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-sky-300 to-violet-100 text-lg font-black text-sky-700 shadow-sm">M</span>
          </div>
          <div className="rounded-2xl bg-white/90 px-4 py-3 text-center text-xs font-black text-slate-600 shadow-sm">
            Đồng bộ nhắc nhở, cảm xúc và lịch chung
          </div>
        </div>
      );
    default:
      return null;
  }
}

function FeatureShowcaseCard({ feature }: { feature: (typeof FEATURE_SHOWCASES)[number] }) {
  return (
    <div className={`group flex min-h-[360px] flex-col overflow-hidden rounded-[2rem] border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-100 bento-card-hover animate-fade-in-up ${feature.cardClass} ${feature.delay}`}>
      <div className={`relative h-44 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${feature.visualClass}`}>
        <FeatureMockup type={feature.visual} />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-2 pt-5">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm ${feature.iconClass}`}>
          <span className="material-symbols-outlined text-[26px]">{feature.icon}</span>
        </div>
        <h3 className="text-xl font-black leading-tight text-slate-900">{feature.title}</h3>
        <p className="text-sm font-medium leading-relaxed text-slate-500">{feature.description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { data: pricing = FALLBACK_PRICING } = usePlanPricing();
  return (
    <div className="lp-root">
      {/* Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="lp-blob bg-rose-100 w-[500px] h-[500px] rounded-full absolute top-[-100px] left-[-100px]" />
        <div className="lp-blob bg-sky-100 w-[400px] h-[400px] rounded-full absolute bottom-[-50px] right-[-50px]" />
        <div className="lp-blob bg-yellow-100 w-[300px] h-[300px] rounded-full absolute top-[40%] left-[30%] opacity-40" />
      </div>

      <div className="relative flex min-h-screen w-full flex-col z-10">
        {/* ── Shared Navbar ── */}
        <div className="pt-4 pb-4">
          <Navbar showAnchors />
        </div>

        {/* ── Hero Section ── */}
        <div className="px-4 md:px-10 flex flex-1 justify-center py-5 md:py-10">
          <div className="flex flex-col max-w-[1100px] flex-1">
            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 py-8">

              {/* Text block */}
              <div className="flex flex-col gap-6 flex-1 text-center md:text-left z-10">
                <div className="flex flex-col gap-4">
                  {/* Badge */}
                  <div className="inline-flex self-center md:self-start items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm w-fit animate-fade-in-up">
                    <span className="material-symbols-outlined text-pink-400 text-sm" style={{ fontSize: '16px' }}>favorite</span>
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Yêu thương trọn vẹn</span>
                  </div>

                  <h1 className="hi-page-title text-3xl md:text-4xl lg:text-5xl animate-fade-in-up delay-100">
                    Hiểu mình, Hiểu người,{' '}
                    <span className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">
                      Yêu thương trọn vẹn
                    </span>
                  </h1>

                  <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-[500px] mx-auto md:mx-0 animate-fade-in-up delay-200">
                    Ứng dụng theo dõi sức khỏe và kết nối tình cảm thông minh. Cùng nhau thấu hiểu chu kỳ, chia sẻ cảm xúc và xây dựng mối quan hệ bền vững.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-2 animate-fade-in-up delay-300">
                  <Link
                    to="/register"
                    className="lp-btn-gradient flex min-w-[140px] cursor-pointer items-center justify-center rounded-full h-12 px-6 text-white text-base font-bold tracking-wide"
                  >
                    Đăng ký ngay
                  </Link>
                  <a
                    href="#features"
                    className="lp-btn-white flex min-w-[140px] cursor-pointer items-center justify-center rounded-full h-12 px-6 bg-white border border-slate-200 text-slate-900 text-base font-bold tracking-wide"
                  >
                    Tìm hiểu thêm
                  </a>
                </div>

                {/* Social proof */}
                <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                  <div className="flex -space-x-3">
                    {HERO_AVATARS.map((avatar, i) => (
                      <div
                        key={i}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-xs font-black shadow-sm ${avatar.className}`}
                      >
                        {avatar.initials}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Được tin dùng bởi <span className="font-bold text-slate-900">10,000+</span> cặp đôi
                  </p>
                </div>
              </div>

              {/* Hero image */}
              <div className="flex-1 w-full flex justify-center z-10">
                <div className="relative w-full max-w-[500px] aspect-square">
                  {/* Glow */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-pink-100 rounded-full opacity-60 blur-2xl animate-pulse" />

                  <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-lg lp-glass p-2 lp-hover-lift">
                    <img
                      src="/images/landP.webp"
                      width={900}
                      height={900}
                      alt="Minh hoa ung dung HiLover"
                      loading="eager"
                      {...HERO_IMAGE_PRIORITY}
                      decoding="async"
                      className="h-full w-full rounded-[2rem] object-cover object-center"
                    />

                    {/* Floating status card */}
                    <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                          <span className="material-symbols-outlined">favorite</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Hôm nay</p>
                          <p className="text-sm text-slate-900 font-bold">Chu kỳ ổn định, tâm trạng vui vẻ ✨</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Feature Section ── */}
        <div id="features" className="px-4 md:px-10 flex flex-1 justify-center py-16 md:py-24 bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col max-w-[1100px] flex-1">
            <div className="flex flex-col items-center gap-12">
              <div className="flex flex-col gap-3 text-center max-w-[700px]">
                <h2 className="hi-page-title text-3xl md:text-4xl">
                  Mọi tính năng bạn cần
                </h2>
                <p className="text-slate-500 text-lg font-normal leading-relaxed">
                  Hi trang bị đầy đủ công cụ để cả hai cùng thấu hiểu, chăm sóc và yêu thương nhau mỗi ngày.
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURE_SHOWCASES.map((feature) => (
                  <FeatureShowcaseCard key={feature.title} feature={feature} />
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* ── Reviews Section ── */}
        <div id="reviews" className="px-4 md:px-10 flex flex-1 justify-center py-16 md:py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent pointer-events-none" />
          <div className="flex flex-col max-w-[1100px] flex-1 z-10">
            <h2 className="hi-page-title text-2xl md:text-3xl mb-10 text-center">
              Cặp đôi nói gì về Harmony Cycle?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Review 1 */}
              <div className="lp-glass p-6 rounded-2xl flex flex-col gap-4 shadow-sm bento-card-hover transition-all animate-fade-in-up delay-100">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black shadow-inner ${REVIEWER_AVATARS.minhAnh.className}`}>
                    {REVIEWER_AVATARS.minhAnh.initials}
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold">Minh Anh</p>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-slate-900 text-base italic">
                  "Giao diện siêu dễ thương! Từ lúc dùng app, anh người yêu mình tinh tế hơn hẳn mỗi khi mình đến ngày."
                </p>
              </div>

              {/* Review 2 */}
              <div className="lp-glass p-6 rounded-2xl flex flex-col gap-4 shadow-sm bento-card-hover transition-all animate-fade-in-up delay-200">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black shadow-inner ${REVIEWER_AVATARS.tuanKiet.className}`}>
                    {REVIEWER_AVATARS.tuanKiet.initials}
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold">Tuấn Kiệt</p>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-slate-900 text-base italic">
                  "Cực kỳ hữu ích cho cánh mày râu. Thông báo nhắc nhở rất khéo léo, giúp mình biết cách chăm sóc cô ấy tốt hơn."
                </p>
              </div>

              {/* Review 3 */}
              <div className="lp-glass p-6 rounded-2xl flex flex-col gap-4 shadow-sm bento-card-hover transition-all animate-fade-in-up delay-300">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black shadow-inner ${REVIEWER_AVATARS.lanPhuong.className}`}>
                    {REVIEWER_AVATARS.lanPhuong.initials}
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold">Lan Phương</p>
                    <div className="flex text-yellow-400">
                      {[...Array(4)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                      <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '16px' }}>star</span>
                    </div>
                  </div>
                </div>
                <p className="text-slate-900 text-base italic">
                  "Màu sắc nhẹ nhàng, không bị rối mắt. AI dự đoán khá chuẩn xác, mình rất thích tính năng nhật ký cảm xúc."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Pricing Section ── */}
        <div id="pricing" className="px-4 md:px-10 flex justify-center py-16 md:py-20 bg-white/50 backdrop-blur-sm">
          <div className="flex w-full max-w-[1100px] flex-col gap-10">
            <div className="mx-auto flex max-w-[720px] flex-col gap-3 text-center">
              <span className="mx-auto w-fit rounded-full border border-pink-100 bg-white px-4 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-pink-700 shadow-sm">
                Gói Đồng Hành
              </span>
              <h2 className="hi-page-title text-3xl md:text-4xl">
                Chọn nhịp chăm sóc phù hợp với bạn
              </h2>
              <p className="text-base font-medium leading-relaxed text-slate-500 md:text-lg">
                Chỉ cần một người trong cặp đôi mua Hi Pro hoặc Hi Max, cả hai cùng dùng quyền lợi Premium.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {LANDING_PLANS.map((plan, index) => {
                const delays = ['delay-100', 'delay-200', 'delay-300'];
                return (
                  <div
                    key={plan.name}
                    className={`relative flex min-h-[420px] flex-col rounded-[2rem] border p-6 shadow-sm bento-card-hover animate-fade-in-up ${delays[index] || ''} ${
                      plan.highlight
                        ? 'border-pink-200 bg-gradient-to-br from-white via-pink-50 to-purple-50'
                        : 'border-slate-100 bg-white/90'
                    }`}
                  >
                    {(plan.planId === 'yearly' ? (pricing.hiMax.discountPercent > 0 ? `Giảm ${pricing.hiMax.discountPercent}%` : plan.badge) : plan.badge) && (
                      <span className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
                        {plan.planId === 'yearly' && pricing.hiMax.discountPercent > 0 ? `Giảm ${pricing.hiMax.discountPercent}%` : plan.badge}
                      </span>
                    )}
                    <div className="mb-6">
                      <h3 className={`text-center text-2xl font-black tracking-tight ${BRAND_GRADIENT_TEXT}`}>{plan.displayName}</h3>
                      <p className="mt-2 min-h-[48px] text-sm font-medium leading-relaxed text-slate-500">{plan.description}</p>
                    </div>

                    <div className="mb-6 flex items-end gap-1">
                      {plan.planId && pricing.activeSale ? (
                        <span className="mr-2 pb-1 text-sm font-bold text-slate-400 line-through">
                          {formatPlanPrice(plan.planId === 'monthly' ? pricing.hiPro.basePrice : pricing.hiMax.basePrice)}
                        </span>
                      ) : null}
                      <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-pink-500 bg-clip-text text-4xl font-black tracking-tight text-transparent">
                        {plan.planId
                          ? formatPlanPrice(plan.planId === 'monthly' ? pricing.hiPro.currentPrice : pricing.hiMax.currentPrice)
                          : plan.price}
                      </span>
                      {plan.suffix && <span className="pb-1 text-sm font-bold text-slate-600">{plan.suffix}</span>}
                    </div>

                    <ul className="mb-8 flex flex-1 flex-col gap-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-slate-600">
                          <span className="material-symbols-outlined mt-0.5 text-[16px] text-pink-400">check_circle</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={plan.to}
                      className={`flex h-12 items-center justify-center rounded-full px-5 text-sm font-extrabold transition-all active:scale-[0.98] ${
                        plan.name === 'Free'
                          ? 'border border-pink-100 bg-white text-pink-500 shadow-sm hover:-translate-y-0.5 hover:bg-pink-50'
                          : 'lp-btn-gradient text-white shadow-lg'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CTA Section ── */}
        <div className="px-4 md:px-10 py-16 flex justify-center">
          <div className="w-full max-w-[1100px] rounded-[2.5rem] bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 p-8 md:p-16 text-center relative overflow-hidden shadow-lg">
            {/* Decorative */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-40 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500 opacity-10 rounded-full blur-2xl translate-x-1/3 translate-y-1/3" />

            <div className="relative z-10 flex flex-col items-center gap-6">
              <h2 className="hi-page-title text-3xl md:text-5xl max-w-[800px]">
                Bắt đầu hành trình thấu hiểu ngay hôm nay
              </h2>
              <p className="text-slate-500 text-lg md:text-xl font-medium max-w-[600px]">
                Đăng ký miễn phí và trải nghiệm sự khác biệt trong mối quan hệ của bạn.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
                <Link
                  to="/register"
                  className="lp-btn-gradient flex min-w-[200px] cursor-pointer items-center justify-center rounded-full h-14 px-8 text-white text-lg font-bold"
                >
                  Đăng ký ngay
                </Link>
              </div>
              <p className="text-sm text-slate-500 mt-2">Không cần thẻ tín dụng • Hủy bất kỳ lúc nào</p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-100 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto grid max-w-[1100px] gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Link to="/" className="flex items-center gap-2">
                <HiLogo size={34} />
                <span
                  className="text-xl font-black tracking-tight"
                  style={{ background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  Hi Lover
                </span>
              </Link>
              <p className="mt-4 max-w-[320px] text-sm font-medium leading-relaxed text-slate-500">
                Hi giúp người Việt theo dõi sức khỏe sinh sản, hiểu cảm xúc và đồng hành với Người ấy bằng dữ liệu cá nhân cùng AI tiếng Việt.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-900">Sản phẩm</h4>
              <div className="flex flex-col gap-3 text-sm font-semibold text-slate-500">
                <a href="#features" className="hover:text-pink-500">Tính năng</a>
                <a href="#pricing" className="hover:text-pink-500">Gói Đồng Hành</a>
                <a href="#reviews" className="hover:text-pink-500">Đánh giá</a>
              </div>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-900">Tài khoản</h4>
              <div className="flex flex-col gap-3 text-sm font-semibold text-slate-500">
                <Link to="/login" className="hover:text-pink-500">Đăng nhập</Link>
                <Link to="/register" className="hover:text-pink-500">Đăng ký</Link>
                <Link to="/terms" className="hover:text-pink-500">Điều khoản</Link>
                <Link to="/privacy" className="hover:text-pink-500">Bảo mật</Link>
                <Link to="/help" className="hover:text-pink-500">Trợ giúp</Link>
              </div>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-900">Liên hệ</h4>
              <div className="flex flex-col gap-3 text-sm font-semibold text-slate-500">
                <a href="mailto:hilover.space@gmail.com" className="hover:text-pink-500">hilover.space@gmail.com</a>
                <a
                  href="https://www.facebook.com/share/1HJnvBpE6L/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-pink-500"
                >
                  Facebook cộng đồng Hi
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 px-4 py-5 text-center text-xs font-semibold text-slate-600">
            © 2026 Hi Lover. All rights reserved. Dự đoán sức khỏe chỉ mang tính tham khảo, không thay thế tư vấn y khoa.
          </div>
        </footer>

      </div>
    </div>
  );
}

export type GuidePlacement = 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface UserGuideStep {
  id: string;
  title: string;
  body: string;
  target?: string;
  placement?: GuidePlacement;
}

export interface UserGuideConfig {
  routeKey: string;
  label: string;
  steps: UserGuideStep[];
}

const sharedNavSteps: UserGuideStep[] = [
  {
    id: 'nav-main',
    title: 'Thanh điều hướng chính',
    body: 'Các mục ở đây đưa bạn tới tổng quan, chu kỳ, người ấy, bản đồ hẹn hò, sản phẩm và cài đặt thông báo.',
    target: '[data-guide="main-nav"]',
    placement: 'bottom',
  },
  {
    id: 'account-menu',
    title: 'Tài khoản của bạn',
    body: 'Mở khu vực này để xem hồ sơ, gói hiện tại, cài đặt cá nhân hoặc đăng xuất.',
    target: '[data-guide="account-menu"]',
    placement: 'bottom',
  },
];

const fallbackGuide: UserGuideConfig = {
  routeKey: 'generic',
  label: 'Trang hiện tại',
  steps: [
    {
      id: 'welcome',
      title: 'Hướng dẫn nhanh',
      body: 'Hi sẽ gợi ý các khu vực quan trọng trên trang này. Bạn có thể bỏ qua hoặc mở lại hướng dẫn bất cứ lúc nào.',
      placement: 'center',
    },
  ],
};

const guideByRoute: Record<string, UserGuideConfig> = {
  password: {
    routeKey: 'password',
    label: 'Khôi phục mật khẩu',
    steps: [
      {
        id: 'password-help',
        title: 'Khôi phục quyền truy cập',
        body: 'Làm theo biểu mẫu trên trang để nhận email đặt lại mật khẩu hoặc nhập mật khẩu mới.',
        target: '[data-guide="auth-form"]',
        placement: 'right',
      },
    ],
  },
  onboarding: {
    routeKey: 'onboarding',
    label: 'Thiết lập ban đầu',
    steps: [
      {
        id: 'onboarding-progress',
        title: 'Thiết lập hồ sơ',
        body: 'Hoàn thành các bước này để Hi biết giới tính, mục tiêu và các cài đặt sức khỏe ban đầu.',
        target: '[data-guide="onboarding-progress"]',
        placement: 'bottom',
      },
      {
        id: 'onboarding-choice',
        title: 'Chọn theo tình trạng thật',
        body: 'Bạn có thể bỏ qua mục chưa chắc chắn và chỉnh lại trong cài đặt sau.',
        target: '[data-guide="onboarding-content"]',
        placement: 'top',
      },
    ],
  },
  femaleDashboard: {
    routeKey: 'female-dashboard',
    label: 'Tổng quan nữ',
    steps: [
      ...sharedNavSteps,
      {
        id: 'cycle-status',
        title: 'Trạng thái chu kỳ',
        body: 'Card này tóm tắt ngày hiện tại trong chu kỳ, dự đoán kỳ tiếp theo và độ tin cậy của dữ liệu.',
        target: '[data-guide="cycle-status"]',
        placement: 'right',
      },
      {
        id: 'partner-card',
        title: 'Kết nối người ấy',
        body: 'Khi đã kết nối, bạn có thể xem cảm xúc, câu hỏi cặp đôi và gửi lời nhắn quan tâm.',
        target: '[data-guide="partner-summary"]',
        placement: 'left',
      },
      {
        id: 'ai-entry',
        title: 'Hỏi Hi AI',
        body: 'Các câu hỏi gợi ý giúp bạn mở nhanh Hi AI để hiểu dữ liệu chu kỳ và cách chăm sóc phù hợp.',
        target: '[data-guide="ai-entry"]',
        placement: 'top',
      },
    ],
  },
  maleDashboard: {
    routeKey: 'male-dashboard',
    label: 'Tổng quan nam',
    steps: [
      ...sharedNavSteps,
      {
        id: 'partner-cycle',
        title: 'Theo dõi người ấy',
        body: 'Khi đã kết nối, bạn sẽ thấy trạng thái chu kỳ và gợi ý chăm sóc phù hợp cho người ấy.',
        target: '[data-guide="partner-summary"]',
        placement: 'bottom',
      },
      {
        id: 'quick-links',
        title: 'Lối tắt tính năng',
        body: 'Dùng các ô này để vào lịch, Hi AI, thông báo hoặc cài đặt nhanh hơn.',
        target: '[data-guide="quick-links"]',
        placement: 'top',
      },
    ],
  },
  cycles: {
    routeKey: 'cycles',
    label: 'Chu kỳ',
    steps: [
      {
        id: 'cycle-stats',
        title: 'Chỉ số chu kỳ',
        body: 'Các thẻ đầu trang tóm tắt độ dài trung bình, số chu kỳ đã ghi và mức ổn định.',
        target: '[data-guide="cycle-stats"]',
        placement: 'bottom',
      },
      {
        id: 'cycle-history',
        title: 'Lịch sử và phân tích',
        body: 'Chuyển giữa lịch sử và phân tích để xem từng kỳ, triệu chứng và xu hướng dài hạn.',
        target: '[data-guide="cycle-tabs"]',
        placement: 'bottom',
      },
    ],
  },
  calendar: {
    routeKey: 'calendar',
    label: 'Lịch',
    steps: [
      {
        id: 'calendar',
        title: 'Lịch chung',
        body: 'Dùng trang này để xem các mốc sức khỏe, lịch cặp đôi và những ngày cần chú ý.',
        target: 'main',
        placement: 'top',
      },
    ],
  },
  chat: {
    routeKey: 'chat',
    label: 'Hi AI Chat',
    steps: [
      {
        id: 'chat-sessions',
        title: 'Phiên trò chuyện',
        body: 'Lịch sử được chia theo ngày để bạn dễ quay lại câu hỏi cũ.',
        target: '[data-guide="chat-sessions"]',
        placement: 'right',
      },
      {
        id: 'chat-suggestions',
        title: 'Câu hỏi gợi ý',
        body: 'Bấm một gợi ý để hỏi nhanh về chu kỳ, người ấy, gói dịch vụ hoặc cách chăm sóc.',
        target: '[data-guide="chat-suggestions"]',
        placement: 'bottom',
      },
      {
        id: 'chat-input',
        title: 'Nhập câu hỏi riêng',
        body: 'Gõ câu hỏi bằng tiếng Việt. Hi AI sẽ trả lời dựa trên dữ liệu tài khoản và tài liệu y khoa có sẵn.',
        target: '[data-guide="chat-input"]',
        placement: 'top',
      },
    ],
  },
  products: {
    routeKey: 'products',
    label: 'Sản phẩm',
    steps: [
      {
        id: 'product-filters',
        title: 'Lọc gợi ý',
        body: 'Tìm theo nhu cầu như ăn uống, đi chơi, chăm sóc cơ thể, wellness hoặc quà tặng.',
        target: '[data-guide="product-filters"]',
        placement: 'bottom',
      },
      {
        id: 'product-list',
        title: 'Danh sách sản phẩm',
        body: 'Mỗi thẻ có mô tả, giá và nút mở sản phẩm hoặc mua voucher nếu đối tác hỗ trợ.',
        target: '[data-guide="product-list"]',
        placement: 'top',
      },
    ],
  },
  coupleMap: {
    routeKey: 'couple-map',
    label: 'Couple Map',
    steps: [
      {
        id: 'map-search',
        title: 'Tìm địa điểm',
        body: 'Tìm quán ăn, cafe hoặc địa chỉ gần bạn, sau đó lưu lại làm điểm hẹn.',
        target: '[data-guide="map-search"]',
        placement: 'bottom',
      },
      {
        id: 'map-list',
        title: 'Lọc và xem địa điểm',
        body: 'Chuyển giữa địa điểm gần bạn và địa điểm đã lưu, lọc theo loại hẹn hò hoặc sắp xếp theo nhu cầu.',
        target: '[data-guide="map-list"]',
        placement: 'right',
      },
    ],
  },
  symptoms: {
    routeKey: 'symptoms',
    label: 'Triệu chứng',
    steps: [
      {
        id: 'symptoms-main',
        title: 'Nhật ký sức khỏe',
        body: 'Ghi lại triệu chứng, tâm trạng và ghi chú mỗi ngày để Hi phân tích xu hướng tốt hơn.',
        target: 'main',
        placement: 'top',
      },
    ],
  },
  notifications: {
    routeKey: 'notifications',
    label: 'Thông báo',
    steps: [
      {
        id: 'notifications-list',
        title: 'Trung tâm thông báo',
        body: 'Theo dõi nhắc nhở chu kỳ, kết nối cặp đôi, thanh toán và các cập nhật quan trọng.',
        target: 'main',
        placement: 'top',
      },
    ],
  },
  settings: {
    routeKey: 'settings',
    label: 'Cài đặt',
    steps: [
      {
        id: 'settings-main',
        title: 'Cài đặt hồ sơ',
        body: 'Cập nhật thông tin cá nhân, trạng thái tài khoản và các tùy chọn riêng tư tại đây.',
        target: 'main',
        placement: 'top',
      },
    ],
  },
  notificationSettings: {
    routeKey: 'notification-settings',
    label: 'Cài đặt thông báo',
    steps: [
      {
        id: 'notification-settings',
        title: 'Kết nối và nhắc nhở',
        body: 'Quản lý mã mời người ấy, thông báo chu kỳ và cách Hi gửi nhắc nhở cho bạn.',
        target: 'main',
        placement: 'top',
      },
    ],
  },
  partner: {
    routeKey: 'partner',
    label: 'Người ấy',
    steps: [
      {
        id: 'partner-hub',
        title: 'Không gian cặp đôi',
        body: 'Quản lý kết nối, kỷ niệm, câu hỏi mỗi ngày và các hoạt động chia sẻ cùng người ấy.',
        target: 'main',
        placement: 'top',
      },
    ],
  },
  connect: {
    routeKey: 'connect',
    label: 'Lời mời kết nối',
    steps: [
      {
        id: 'connect-invite',
        title: 'Lời mời từ người ấy',
        body: 'Trang này giúp bạn xem và chấp nhận lời mời kết nối cặp đôi nếu mã mời còn hiệu lực.',
        target: 'main',
        placement: 'center',
      },
    ],
  },
  payment: {
    routeKey: 'payment',
    label: 'Kết quả thanh toán',
    steps: [
      {
        id: 'payment-result',
        title: 'Kết quả thanh toán',
        body: 'Kiểm tra trạng thái thanh toán hoặc quay lại Hi Shop nếu bạn muốn chọn voucher khác.',
        target: 'main',
        placement: 'center',
      },
    ],
  },
  static: {
    routeKey: 'static',
    label: 'Thông tin hỗ trợ',
    steps: [
      {
        id: 'static-page',
        title: 'Thông tin cần biết',
        body: 'Trang này chứa nội dung hỗ trợ, điều khoản hoặc chính sách. Bạn có thể quay lại app bằng logo hoặc thanh điều hướng.',
        target: 'main',
        placement: 'center',
      },
    ],
  },
};

export function getUserGuideConfig(pathname: string): UserGuideConfig | null {
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register')) return null;
  if (pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) return guideByRoute.password;
  if (pathname.startsWith('/onboarding')) return guideByRoute.onboarding;
  if (pathname.startsWith('/female-dashboard')) return guideByRoute.femaleDashboard;
  if (pathname.startsWith('/male-dashboard') || pathname === '/dashboard') return guideByRoute.maleDashboard;
  if (pathname.startsWith('/cycles')) return guideByRoute.cycles;
  if (pathname.startsWith('/calendar')) return guideByRoute.calendar;
  if (pathname.startsWith('/chat')) return guideByRoute.chat;
  if (pathname.startsWith('/products')) return guideByRoute.products;
  if (pathname.startsWith('/couple-map')) return guideByRoute.coupleMap;
  if (pathname.startsWith('/symptoms')) return guideByRoute.symptoms;
  if (pathname.startsWith('/notifications')) return guideByRoute.notifications;
  if (pathname === '/settings') return guideByRoute.settings;
  if (pathname.startsWith('/settings/notifications') || pathname.startsWith('/male-settings/notifications')) return guideByRoute.notificationSettings;
  if (pathname.startsWith('/partner')) return guideByRoute.partner;
  if (pathname.startsWith('/connect')) return guideByRoute.connect;
  if (pathname.startsWith('/payment')) return guideByRoute.payment;
  if (pathname.startsWith('/terms') || pathname.startsWith('/privacy') || pathname.startsWith('/help')) return guideByRoute.static;
  return fallbackGuide;
}

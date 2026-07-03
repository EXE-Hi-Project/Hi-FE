import { Link } from 'react-router-dom';
import HiLogo from '../components/ui/HiLogo';

type LegalKind = 'terms' | 'privacy' | 'help';

const CONTENT: Record<LegalKind, {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  sections: Array<{ title: string; body: string[] }>;
}> = {
  terms: {
    eyebrow: 'Điều khoản',
    title: 'Điều khoản sử dụng Hi',
    description: 'Các nguyên tắc sử dụng Hi trong giai đoạn MVP, bao gồm phạm vi dịch vụ, giới hạn y khoa, chia sẻ dữ liệu với Người ấy và gói dịch vụ.',
    cta: 'Bắt đầu dùng Hi',
    sections: [
      {
        title: '1. Phạm vi dịch vụ',
        body: [
          'Hi hỗ trợ theo dõi sức khỏe sinh sản, chu kỳ, triệu chứng, cảm xúc, nhắc nhở, video được duyệt và trò chuyện với Hi AI.',
          'Các dự đoán về chu kỳ, rụng trứng và cửa sổ thụ thai chỉ là ước tính dựa trên dữ liệu bạn ghi nhận.',
        ],
      },
      {
        title: '2. Không thay thế tư vấn y khoa',
        body: [
          'Hi không chẩn đoán bệnh, không kê đơn và không thay thế bác sĩ hoặc cơ sở y tế.',
          'Nếu có đau dữ dội, ra máu bất thường, sốt, chóng mặt, nghi ngờ mang thai hoặc triệu chứng nghiêm trọng, hãy liên hệ bác sĩ.',
        ],
      },
      {
        title: '3. Tài khoản và bảo mật',
        body: [
          'Bạn chịu trách nhiệm giữ an toàn thông tin đăng nhập và không chia sẻ tài khoản cho người khác.',
          'Admin có thể khóa hoặc xóa mềm tài khoản khi phát hiện lạm dụng, vi phạm hoặc yêu cầu hỗ trợ hợp lệ.',
        ],
      },
      {
        title: '4. Người ấy và chia sẻ dữ liệu',
        body: [
          'Tính năng Người ấy chỉ hoạt động khi hai tài khoản chủ động kết nối.',
          'Bạn có thể hủy kết nối bất kỳ lúc nào. Dữ liệu chia sẻ sẽ dừng hiển thị sau khi hủy kết nối.',
        ],
      },
      {
        title: '5. Gói Đồng Hành và thanh toán',
        body: [
          'Gói Free gồm đầy đủ công cụ chăm sóc sức khỏe, cá nhân hóa AI và nhắc nhở. Hi Pro và Hi Max mở hạn mức AI cao hơn, phân tích chuyên sâu và trải nghiệm cặp đôi nâng cao.',
          'Chính sách hủy, hoàn tiền và thời hạn gói có thể được cập nhật theo cổng thanh toán đang dùng.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Bảo mật',
    title: 'Chính sách bảo mật',
    description: 'Hi xử lý dữ liệu sức khỏe sinh sản với nguyên tắc tối thiểu, minh bạch và có kiểm soát từ người dùng.',
    cta: 'Tạo tài khoản an toàn',
    sections: [
      {
        title: '1. Dữ liệu Hi thu thập',
        body: [
          'Thông tin tài khoản: tên, email, giới tính, trạng thái onboarding và cài đặt thông báo.',
          'Dữ liệu sức khỏe bạn nhập: chu kỳ, triệu chứng, lượng kinh, cảm xúc, ghi chú, sở thích và mục tiêu sức khỏe.',
        ],
      },
      {
        title: '2. Cách sử dụng dữ liệu',
        body: [
          'Hi dùng dữ liệu để hiển thị dashboard, dự đoán chu kỳ, phân tích xu hướng, cá nhân hóa nhắc nhở, đề xuất video và hỗ trợ Hi AI.',
          'Dữ liệu chu kỳ chỉ được dùng để ước tính, không tạo chẩn đoán y khoa tự động.',
        ],
      },
      {
        title: '3. Chia sẻ với Người ấy',
        body: [
          'Hi chỉ hiển thị dữ liệu cho Người ấy khi bạn đã kết nối tài khoản.',
          'Cảm xúc nhanh có thể tạo thông báo cho Người ấy, nhưng không tự chia sẻ toàn bộ nhật ký chi tiết.',
        ],
      },
      {
        title: '4. Email, thông báo và video',
        body: [
          'Hi có thể gửi thông báo web và email cho nhắc chu kỳ, hỏi thăm hằng ngày, cập nhật Người ấy hoặc thông báo admin.',
          'Video YouTube được nhúng bằng trình phát chính thức; YouTube có thể xử lý dữ liệu theo chính sách riêng của họ.',
        ],
      },
      {
        title: '5. Liên hệ và quyền của bạn',
        body: [
          'Bạn có thể yêu cầu hỗ trợ, cập nhật hoặc xử lý dữ liệu qua email hilover.space@gmail.com.',
          'Trong MVP, thao tác xóa tài khoản là xóa mềm để tránh mất dữ liệu sức khỏe và phục vụ đối soát khi cần.',
        ],
      },
    ],
  },
  help: {
    eyebrow: 'Trợ giúp',
    title: 'Trung tâm trợ giúp Hi',
    description: 'Các hướng dẫn nhanh để bạn dùng Hi rõ ràng hơn trong giai đoạn MVP.',
    cta: 'Đăng ký Hi',
    sections: [
      {
        title: 'Bắt đầu',
        body: [
          'Đăng ký, hoàn tất onboarding và nhập kỳ kinh gần nhất nếu bạn là user nữ.',
          'Nếu là user nam, bạn có thể kết nối Người ấy để xem dữ liệu chu kỳ được chia sẻ.',
        ],
      },
      {
        title: 'Theo dõi chu kỳ',
        body: [
          'Chu kỳ đã xác nhận được lưu trong lịch sử. Dự đoán kỳ tiếp theo không được ghi thành kỳ thật cho tới khi user xác nhận.',
          'Bạn có thể thêm lịch sử chu kỳ để Hi học độ dài chu kỳ trung bình chính xác hơn.',
        ],
      },
      {
        title: 'Triệu chứng và cảm xúc',
        body: [
          'Dùng nhật ký chi tiết để ghi lượng kinh, cục máu đông, tâm trạng, triệu chứng, tiêu hóa, tiết dịch và ghi chú.',
          'Cảm xúc nhanh giúp lưu mood trong ngày và có thể gửi tín hiệu nhẹ tới Người ấy khi đã kết nối.',
        ],
      },
      {
        title: 'Hi AI',
        body: [
          'Hi AI có thể trả lời về tính năng Hi và dữ liệu sức khỏe bạn đã lưu trong phạm vi tài khoản hiện tại.',
          'Nếu nhà cung cấp AI chưa cấu hình, Hi vẫn trả lời fallback cho các câu hỏi cơ bản về sản phẩm và chu kỳ đã lưu.',
        ],
      },
      {
        title: 'Liên hệ',
        body: [
          'Nếu cần hỗ trợ tài khoản, thanh toán hoặc dữ liệu, gửi email tới hilover.space@gmail.com.',
          'Facebook cộng đồng: https://www.facebook.com/share/1HJnvBpE6L/',
        ],
      },
    ],
  },
};

function LegalPage({ kind }: { kind: LegalKind }) {
  const content = CONTENT[kind];
  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f1fb] px-4 py-8 font-sans text-slate-800">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-28 -top-28 h-[420px] w-[420px] rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute bottom-[-160px] right-[-120px] h-[460px] w-[460px] rounded-full bg-pink-200/55 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-violet-100/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <HiLogo size={40} />
            <span className="text-xl font-black text-slate-900">Hi Lover</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hi-btn-secondary hidden rounded-full px-5 py-2 text-sm font-bold sm:inline-flex">
              Đăng nhập
            </Link>
            <Link to="/register" className="hi-btn-primary rounded-full px-5 py-2 text-sm font-black">
              Đăng ký
            </Link>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/85 p-7 shadow-xl shadow-pink-100/40 backdrop-blur-xl md:p-12">
          <div className="absolute right-8 top-8 hidden rounded-full bg-gradient-to-r from-sky-100 via-violet-100 to-pink-100 px-5 py-2 text-xs font-black text-violet-600 md:block">
            Hi wellness policy
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-500">{content.eyebrow}</p>
          <h1 className="hi-page-title mt-3 max-w-4xl text-3xl md:text-5xl">{content.title}</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-500 md:text-base">{content.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register" className="hi-btn-primary inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black">
              {content.cta}
            </Link>
            <Link to="/help" className="hi-btn-secondary inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black">
              Cần hỗ trợ?
            </Link>
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {content.sections.map((section, index) => (
            <article key={section.title} className="group rounded-[2rem] border border-white/70 bg-white/82 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-100/50">
              <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 via-violet-100 to-pink-100 text-sm font-black text-violet-600">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h2 className="text-lg font-black text-slate-900">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((line) => (
                  <p key={line} className="text-sm font-medium leading-7 text-slate-600">{line}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <footer className="py-8 text-center text-xs font-semibold text-slate-400">
          © 2026 Hi. Liên hệ: <a href="mailto:hilover.space@gmail.com" className="font-black text-pink-500">hilover.space@gmail.com</a>
        </footer>
      </div>
    </div>
  );
}

export function TermsPage() {
  return <LegalPage kind="terms" />;
}

export function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}

export function HelpPage() {
  return <LegalPage kind="help" />;
}

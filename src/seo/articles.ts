export interface ArticleSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface ArticleSource {
  label: string;
  url: string;
}

export interface HealthArticle {
  slug: string;
  title: string;
  description: string;
  summary: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  readMinutes: number;
  author: string;
  reviewer: string;
  sections: ArticleSection[];
  sources: ArticleSource[];
  faqs: Array<{ question: string; answer: string }>;
}

const commonMeta = {
  publishedAt: '2026-07-12',
  updatedAt: '2026-07-12',
  author: 'Đội ngũ nội dung HiLover',
  reviewer: 'Nhóm sản phẩm HiLover',
};

export const healthArticles: HealthArticle[] = [
  {
    ...commonMeta,
    slug: 'cach-theo-doi-chu-ky-kinh-nguyet',
    title: 'Cách theo dõi chu kỳ kinh nguyệt dễ hiểu và nhất quán',
    description: 'Hướng dẫn ghi nhận ngày bắt đầu kỳ kinh, triệu chứng và những thay đổi cần lưu ý để hiểu chu kỳ của bạn tốt hơn.',
    summary: 'Theo dõi chu kỳ không phải là đoán một ngày chính xác. Điều hữu ích nhất là ghi nhận đều đặn để nhận ra nhịp riêng của cơ thể.',
    category: 'Chu kỳ kinh nguyệt', readMinutes: 5,
    sections: [
      { id: 'bat-dau', title: 'Bắt đầu từ ngày đầu kỳ kinh', paragraphs: ['Ngày 1 của chu kỳ là ngày bắt đầu ra máu kinh thực sự, không tính vài đốm máu rất nhẹ xuất hiện trước đó.', 'Ghi ngày bắt đầu và kết thúc của từng kỳ kinh giúp bạn nhìn được độ dài chu kỳ theo thời gian.'] },
      { id: 'ghi-nhan', title: 'Ghi nhận thêm bối cảnh', paragraphs: ['Bạn có thể ghi mức độ ra máu, đau bụng, tâm trạng, giấc ngủ hoặc các triệu chứng đáng chú ý. Chỉ chọn những thông tin thực sự hữu ích với bạn.', 'Một thay đổi đơn lẻ chưa chắc là bất thường; xu hướng lặp lại qua nhiều chu kỳ mới cung cấp nhiều bối cảnh hơn.'] },
      { id: 'khi-nao-can-ho-tro', title: 'Khi nào nên tìm hỗ trợ y tế', paragraphs: ['Hãy trao đổi với nhân viên y tế nếu bạn lo lắng về chảy máu rất nhiều, đau dữ dội, choáng, hoặc thay đổi kéo dài so với nhịp thường thấy.', 'HiLover chỉ hỗ trợ ghi nhận và cung cấp thông tin tham khảo, không chẩn đoán nguyên nhân.'] },
    ],
    sources: [{ label: 'Office on Women’s Health – Menstrual cycle', url: 'https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle' }],
    faqs: [{ question: 'Chu kỳ có phải lúc nào cũng 28 ngày?', answer: 'Không. Độ dài chu kỳ khác nhau giữa mỗi người và có thể thay đổi theo thời gian.' }],
  },
  {
    ...commonMeta,
    slug: 'cach-tinh-ngay-chu-ky',
    title: 'Cách tính ngày chu kỳ và hiểu giới hạn của dự đoán',
    description: 'Cách đếm ngày chu kỳ, tính độ dài trung bình và sử dụng dự đoán một cách thận trọng.',
    summary: 'Độ dài chu kỳ được tính từ ngày đầu kỳ kinh này đến ngày trước kỳ kinh tiếp theo. Dự đoán chỉ là ước tính từ dữ liệu đã ghi.',
    category: 'Chu kỳ kinh nguyệt', readMinutes: 4,
    sections: [
      { id: 'cong-thuc', title: 'Cách đếm ngày', paragraphs: ['Bắt đầu đếm từ ngày đầu ra máu kinh của kỳ hiện tại. Chu kỳ kết thúc vào ngày trước khi kỳ tiếp theo bắt đầu.', 'Ví dụ, kỳ kinh bắt đầu ngày 1 và kỳ tiếp theo bắt đầu ngày 29 thì chu kỳ dài 28 ngày.'] },
      { id: 'trung-binh', title: 'Dùng nhiều chu kỳ để tham khảo', paragraphs: ['Trung bình từ vài chu kỳ gần đây hữu ích hơn việc dựa vào một tháng duy nhất. Dữ liệu càng đều thì khoảng dự đoán càng có thêm bối cảnh.', 'Stress, bệnh, giấc ngủ, thay đổi cân nặng và nhiều yếu tố khác có thể làm thời điểm kỳ kinh thay đổi.'] },
      { id: 'gioi-han', title: 'Không dùng dự đoán như biện pháp tránh thai', paragraphs: ['Dự đoán trên ứng dụng không xác nhận rụng trứng và không nên được xem là biện pháp tránh thai.', 'Nếu cần tư vấn kế hoạch sinh sản hoặc tránh thai, hãy trao đổi với nhân viên y tế.'] },
    ],
    sources: [{ label: 'ACOG – Your menstrual cycle', url: 'https://www.acog.org/womens-health/infographics/the-menstrual-cycle' }],
    faqs: [{ question: 'Dự đoán có thể sai không?', answer: 'Có. Dự đoán là ước tính và có thể thay đổi khi chu kỳ thực tế thay đổi.' }],
  },
  {
    ...commonMeta,
    slug: 'tre-kinh-khi-nao-can-luu-y',
    title: 'Trễ kinh: những điều nên ghi nhận và khi nào cần lưu ý',
    description: 'Thông tin tham khảo về trễ kinh, cách ghi nhận bối cảnh và dấu hiệu cần trao đổi với nhân viên y tế.',
    summary: 'Trễ kinh có nhiều nguyên nhân. Ghi lại thời điểm, triệu chứng và khả năng mang thai giúp bạn chuẩn bị thông tin tốt hơn khi cần tư vấn.',
    category: 'Sức khỏe nữ', readMinutes: 5,
    sections: [
      { id: 'boi-canh', title: 'Xem lại bối cảnh gần đây', paragraphs: ['Chu kỳ có thể thay đổi cùng stress, vận động, giấc ngủ, thay đổi cân nặng, bệnh hoặc thuốc. Không nên tự kết luận nguyên nhân chỉ từ ngày dự đoán.', 'Nếu có khả năng mang thai, hãy làm xét nghiệm theo hướng dẫn của sản phẩm xét nghiệm hoặc nhân viên y tế.'] },
      { id: 'ghi-lai', title: 'Thông tin nên ghi lại', paragraphs: ['Ghi ngày kỳ kinh gần nhất, những lần quan hệ có khả năng mang thai, thuốc đang dùng và triệu chứng đi kèm.', 'Thông tin này giúp cuộc trao đổi với nhân viên y tế rõ ràng hơn, nhưng không thay thế thăm khám.'] },
      { id: 'can-kham', title: 'Tìm hỗ trợ khi bạn lo lắng', paragraphs: ['Hãy liên hệ cơ sở y tế nếu trễ kinh kéo dài, lặp lại, hoặc đi kèm đau nhiều, chảy máu bất thường, choáng hay triệu chứng khiến bạn lo lắng.', 'Trong tình huống khẩn cấp, hãy sử dụng dịch vụ cấp cứu tại nơi bạn sinh sống.'] },
    ],
    sources: [{ label: 'NHS – Periods and fertility', url: 'https://www.nhs.uk/conditions/periods/' }],
    faqs: [{ question: 'Trễ kinh có đồng nghĩa mang thai?', answer: 'Không. Mang thai là một khả năng, nhưng chu kỳ có thể thay đổi vì nhiều nguyên nhân khác.' }],
  },
  {
    ...commonMeta,
    slug: 'ghi-nhan-trieu-chung-hang-ngay',
    title: 'Ghi nhận triệu chứng hằng ngày mà không bị quá tải',
    description: 'Cách xây dựng thói quen ghi nhận triệu chứng ngắn gọn, riêng tư và có ích khi nhìn lại.',
    summary: 'Một bản ghi ngắn nhưng đều đặn thường hữu ích hơn danh sách quá chi tiết khiến bạn nhanh bỏ cuộc.',
    category: 'Thói quen sức khỏe', readMinutes: 4,
    sections: [
      { id: 'toi-gian', title: 'Chọn vài tín hiệu quan trọng', paragraphs: ['Bắt đầu với mức đau, mức ra máu, tâm trạng và một ghi chú ngắn nếu cần. Bạn không phải ghi mọi mục mỗi ngày.', 'Dùng cùng một cách đánh giá qua thời gian để dễ nhìn ra thay đổi.'] },
      { id: 'khong-chan-doan', title: 'Dữ liệu là bối cảnh, không phải chẩn đoán', paragraphs: ['Mối liên hệ giữa hai dấu hiệu trên lịch không tự chứng minh nguyên nhân y khoa.', 'Nếu một triệu chứng mới, nặng lên hoặc ảnh hưởng sinh hoạt, hãy trao đổi với nhân viên y tế thay vì chỉ dựa vào biểu đồ.'] },
      { id: 'rieng-tu', title: 'Bảo vệ thông tin riêng tư', paragraphs: ['Chỉ ghi thông tin cần thiết và kiểm tra cài đặt tài khoản trước khi chia sẻ với bạn đời.', 'Không gửi mật khẩu, OTP hoặc thông tin nhạy cảm không cần thiết qua kênh hỗ trợ.'] },
    ],
    sources: [{ label: 'CDC – About chronic diseases and tracking health', url: 'https://www.cdc.gov/chronic-disease/about/index.html' }],
    faqs: [{ question: 'Có cần ghi mỗi ngày không?', answer: 'Không bắt buộc. Hãy chọn nhịp ghi nhận bạn có thể duy trì và phù hợp với mục tiêu của mình.' }],
  },
  {
    ...commonMeta,
    slug: 'suc-khoe-sinh-san-nam-nhung-dieu-co-ban',
    title: 'Sức khỏe sinh sản nam: những điều cơ bản nên quan tâm',
    description: 'Các thói quen cơ bản và dấu hiệu nên chủ động trao đổi với nhân viên y tế về sức khỏe sinh sản nam.',
    summary: 'Sức khỏe sinh sản nam liên quan đến sức khỏe tổng thể, lối sống và việc chủ động tìm hỗ trợ khi có thay đổi đáng lo.',
    category: 'Sức khỏe nam', readMinutes: 5,
    sections: [
      { id: 'tong-the', title: 'Chăm sóc sức khỏe tổng thể', paragraphs: ['Giấc ngủ, vận động, dinh dưỡng, thuốc lá, rượu và bệnh nền đều là những bối cảnh đáng quan tâm.', 'Khám sức khỏe định kỳ là cơ hội để trao đổi riêng tư về tình dục và sinh sản.'] },
      { id: 'chu-dong', title: 'Không trì hoãn khi có thay đổi', paragraphs: ['Đau, sưng, tổn thương, thay đổi chức năng tình dục hoặc triệu chứng kéo dài nên được nhân viên y tế đánh giá.', 'Không tự dùng thuốc hoặc thực phẩm bổ sung chỉ dựa trên quảng cáo.'] },
      { id: 'giao-tiep', title: 'Trao đổi tôn trọng với bạn đời', paragraphs: ['Sức khỏe sinh sản là trách nhiệm chung, nhưng mỗi người vẫn có quyền riêng tư và quyền quyết định với dữ liệu của mình.', 'Tập trung vào lắng nghe và hỗ trợ thay vì suy đoán hoặc gây áp lực.'] },
    ],
    sources: [{ label: 'WHO – Sexual and reproductive health', url: 'https://www.who.int/health-topics/sexual-and-reproductive-health-and-research' }],
    faqs: [{ question: 'Ứng dụng có đánh giá khả năng sinh sản không?', answer: 'Không. HiLover không xét nghiệm hoặc chẩn đoán khả năng sinh sản.' }],
  },
  {
    ...commonMeta,
    slug: 'cach-ho-tro-ban-doi-trong-chu-ky',
    title: 'Cách hỗ trợ bạn đời trong chu kỳ một cách tinh tế',
    description: 'Gợi ý giao tiếp, hỏi nhu cầu và hỗ trợ bạn đời mà vẫn tôn trọng quyền riêng tư.',
    summary: 'Sự hỗ trợ tốt bắt đầu từ việc hỏi và lắng nghe. Không phải ai cũng muốn nhận cùng một kiểu chăm sóc.',
    category: 'Đồng hành', readMinutes: 4,
    sections: [
      { id: 'hoi', title: 'Hỏi trước khi giúp', paragraphs: ['Một câu hỏi cụ thể như “Hôm nay mình có thể giúp gì?” thường dễ trả lời hơn việc tự đoán.', 'Tôn trọng khi bạn đời muốn nghỉ ngơi, muốn ở một mình hoặc không muốn chia sẻ dữ liệu sức khỏe.'] },
      { id: 'thiet-thuc', title: 'Ưu tiên hỗ trợ thiết thực', paragraphs: ['Chia sẻ việc nhà, chuẩn bị đồ dùng cần thiết hoặc nhắc lịch theo mong muốn có thể hữu ích hơn những lời khuyên không được yêu cầu.', 'Không xem dự đoán chu kỳ là sự thật chắc chắn về cảm xúc hoặc cơ thể của một người.'] },
      { id: 'can-ho-tro', title: 'Khuyến khích tìm hỗ trợ khi cần', paragraphs: ['Nếu bạn đời đau nhiều hoặc có triệu chứng đáng lo, hãy khuyến khích họ tìm tư vấn y tế và hỗ trợ về việc đi lại nếu họ đồng ý.', 'Trong tình huống khẩn cấp, ưu tiên liên hệ dịch vụ cấp cứu.'] },
    ],
    sources: [{ label: 'WHO – Self-care interventions for health', url: 'https://www.who.int/health-topics/self-care' }],
    faqs: [{ question: 'Có nên tự động xem dữ liệu chu kỳ của bạn đời?', answer: 'Không. Việc chia sẻ dữ liệu cần sự đồng ý chủ động và có thể được thu hồi.' }],
  },
];

export function getArticle(slug: string) {
  return healthArticles.find((article) => article.slug === slug);
}

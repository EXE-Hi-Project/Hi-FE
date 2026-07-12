import { healthArticles } from './articles';

export const SITE_URL = 'https://www.hilover.space';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-hilover.png`;

export interface SeoRoute {
  path: string;
  title: string;
  description: string;
  type?: 'website' | 'article';
  publishedAt?: string;
  updatedAt?: string;
}

const staticRoutes: SeoRoute[] = [
  { path: '/', title: 'HiLover - Theo dõi sức khỏe sinh sản và kết nối cặp đôi', description: 'HiLover giúp người dùng Việt theo dõi chu kỳ, ghi nhận triệu chứng, chăm sóc sức khỏe sinh sản và đồng hành cùng bạn đời.' },
  { path: '/help', title: 'Trung tâm trợ giúp HiLover', description: 'Tìm hướng dẫn sử dụng HiLover, theo dõi chu kỳ, kết nối bạn đời, quyền riêng tư và hỗ trợ tài khoản.' },
  { path: '/privacy', title: 'Chính sách quyền riêng tư - HiLover', description: 'Tìm hiểu cách HiLover thu thập, sử dụng và bảo vệ dữ liệu cá nhân và dữ liệu sức khỏe của bạn.' },
  { path: '/terms', title: 'Điều khoản sử dụng - HiLover', description: 'Điều khoản sử dụng ứng dụng HiLover và trách nhiệm của người dùng khi sử dụng dịch vụ.' },
  { path: '/kien-thuc', title: 'Kiến thức sức khỏe sinh sản - HiLover', description: 'Bài viết dễ hiểu về chu kỳ, triệu chứng, sức khỏe sinh sản nam nữ và cách đồng hành cùng bạn đời.' },
  { path: '/kien-thuc/quy-trinh-bien-tap', title: 'Quy trình biên tập nội dung - HiLover', description: 'Cách đội ngũ HiLover xây dựng, kiểm tra nguồn và cập nhật nội dung sức khỏe.' },
];

export const indexableRoutes: SeoRoute[] = [
  ...staticRoutes,
  ...healthArticles.map((article) => ({
    path: `/kien-thuc/${article.slug}`,
    title: `${article.title} - HiLover`,
    description: article.description,
    type: 'article' as const,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
  })),
];

export function findSeoRoute(pathname: string) {
  const normalized = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;
  return indexableRoutes.find((route) => route.path === normalized);
}

export function canonicalUrl(path: string) {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

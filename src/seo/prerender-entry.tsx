import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LandingPage from '../pages/LandingPage';
import SupportPage from '../pages/SupportPage';
import { PrivacyPage, TermsPage } from '../pages/LegalPages';
import { EditorialProcessPage, KnowledgeArticlePage, KnowledgeHubPage, NotFoundPage } from '../pages/KnowledgePages';
import { canonicalUrl, DEFAULT_OG_IMAGE, findSeoRoute, indexableRoutes, SITE_URL } from './manifest';
import { getArticle } from './articles';

export { indexableRoutes };

function pageForPath(path: string) {
  if (path === '/') return <LandingPage />;
  if (path === '/help') return <SupportPage />;
  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/terms') return <TermsPage />;
  if (path === '/kien-thuc') return <KnowledgeHubPage />;
  if (path === '/kien-thuc/quy-trinh-bien-tap') return <EditorialProcessPage />;
  if (path === '/404') return <NotFoundPage />;
  return <KnowledgeArticlePage />;
}

function jsonLdForPath(path: string) {
  const common = { '@context': 'https://schema.org' };
  if (path === '/') return [{ ...common, '@type': 'WebSite', name: 'HiLover', alternateName: 'Hi', url: `${SITE_URL}/`, inLanguage: 'vi-VN' }, { ...common, '@type': 'Organization', name: 'HiLover', url: `${SITE_URL}/`, logo: `${SITE_URL}/icons/icon-512.png` }];
  if (path.startsWith('/kien-thuc/') && path !== '/kien-thuc/quy-trinh-bien-tap') {
    const article = getArticle(path.replace('/kien-thuc/', ''));
    if (!article) return [];
    return [{ ...common, '@type': 'Article', headline: article.title, description: article.description, datePublished: article.publishedAt, dateModified: article.updatedAt, inLanguage: 'vi-VN', mainEntityOfPage: canonicalUrl(path), author: { '@type': 'Organization', name: article.author }, publisher: { '@type': 'Organization', name: 'HiLover', logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` } } }, { ...common, '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: 'Kiến thức', item: `${SITE_URL}/kien-thuc` }, { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl(path) }] }];
  }
  return [];
}

export function render(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <StaticRouter location={path}>
        <Routes>
          <Route path="/kien-thuc/quy-trinh-bien-tap" element={<EditorialProcessPage />} />
          <Route path="/kien-thuc/:slug" element={<KnowledgeArticlePage />} />
          <Route path="*" element={pageForPath(path)} />
        </Routes>
      </StaticRouter>
    </QueryClientProvider>,
  );
}

export function renderHead(path: string) {
  const route = findSeoRoute(path);
  if (!route) return '';
  const url = canonicalUrl(route.path);
  const jsonLd = jsonLdForPath(path).map((data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`).join('\n');
  return [`<title>${route.title}</title>`, `<meta name="description" content="${route.description.replace(/"/g, '&quot;')}" />`, '<meta name="robots" content="index, follow, max-image-preview:large" />', `<link rel="canonical" href="${url}" />`, `<meta property="og:type" content="${route.type ?? 'website'}" />`, '<meta property="og:site_name" content="HiLover" />', `<meta property="og:title" content="${route.title.replace(/"/g, '&quot;')}" />`, `<meta property="og:description" content="${route.description.replace(/"/g, '&quot;')}" />`, `<meta property="og:url" content="${url}" />`, `<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />`, '<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />', '<meta property="og:image:alt" content="HiLover - người bạn đồng hành sức khỏe sinh sản" />', '<meta name="twitter:card" content="summary_large_image" />', `<meta name="twitter:title" content="${route.title.replace(/"/g, '&quot;')}" />`, `<meta name="twitter:description" content="${route.description.replace(/"/g, '&quot;')}" />`, `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />`, jsonLd].join('\n');
}

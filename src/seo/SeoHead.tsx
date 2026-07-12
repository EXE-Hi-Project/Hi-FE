import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalUrl, DEFAULT_OG_IMAGE, findSeoRoute } from './manifest';

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export default function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const route = findSeoRoute(pathname);
    const robots = route ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';
    const title = route?.title ?? 'HiLover';
    const description = route?.description ?? 'Khu vực riêng tư dành cho người dùng HiLover.';
    document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[name="robots"]', 'name', 'robots', robots);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', route?.type ?? 'website');
    setMeta('meta[property="og:image"]', 'property', 'og:image', DEFAULT_OG_IMAGE);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', DEFAULT_OG_IMAGE);

    document.head.querySelectorAll('link[rel="canonical"]').forEach((node) => node.remove());
    if (route) {
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = canonicalUrl(route.path);
      document.head.appendChild(canonical);
      setMeta('meta[property="og:url"]', 'property', 'og:url', canonical.href);
    }
  }, [pathname]);

  return null;
}

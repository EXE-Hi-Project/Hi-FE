import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const requiredPaths = ['/', '/help', '/privacy', '/terms', '/kien-thuc', '/kien-thuc/quy-trinh-bien-tap', '/kien-thuc/cach-theo-doi-chu-ky-kinh-nguyet'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const route of requiredPaths) {
  const file = route === '/' ? path.join(dist, 'index.html') : path.join(dist, route.slice(1), 'index.html');
  await access(file);
  const html = await readFile(file, 'utf8');
  assert(/<title>[^<]+<\/title>/.test(html), `${route}: missing title`);
  assert(/<meta name="description" content="[^"]+"/.test(html), `${route}: missing description`);
  assert(html.includes('name="robots" content="index, follow'), `${route}: not indexable`);
  assert(html.includes(`rel="canonical" href="https://www.hilover.space${route === '/' ? '/' : route}"`), `${route}: incorrect canonical`);
  assert(html.includes('data-prerendered="true"'), `${route}: missing prerendered HTML`);
}

const article = await readFile(path.join(dist, 'kien-thuc', 'cach-theo-doi-chu-ky-kinh-nguyet', 'index.html'), 'utf8');
assert(article.includes('"@type":"Article"'), 'article: missing Article JSON-LD');
assert(article.includes('"@type":"BreadcrumbList"'), 'article: missing breadcrumb JSON-LD');
assert(article.includes('Cách theo dõi chu kỳ'), 'article: missing visible content');

const appShell = await readFile(path.join(dist, 'app-shell.html'), 'utf8');
assert(appShell.includes('name="robots" content="noindex, nofollow"'), 'app shell must be noindex');

const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
assert(!/\/(login|dashboard|admin)(?:<|\/)/.test(sitemap), 'sitemap contains a private route');
assert((sitemap.match(/<url>/g) ?? []).length === 12, 'sitemap route count is unexpected');

await access(path.join(dist, '404.html'));
await access(path.join(dist, 'cloudfront-viewer-request.js'));
console.log('SEO verification passed.');

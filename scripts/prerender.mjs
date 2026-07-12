import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const bundle = await import(pathToFileURL(path.join(root, 'dist-ssr', 'prerender-entry.js')).href);

function removeManagedHead(html) {
  return html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
}

const cleanTemplate = removeManagedHead(template);
for (const route of bundle.indexableRoutes) {
  const targetDirectory = route.path === '/' ? dist : path.join(dist, route.path.slice(1));
  await mkdir(targetDirectory, { recursive: true });
  const html = cleanTemplate
    .replace('</head>', `${bundle.renderHead(route.path)}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root" data-prerendered="true">${bundle.render(route.path)}</div>`);
  await writeFile(path.join(targetDirectory, 'index.html'), html, 'utf8');
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${bundle.indexableRoutes.map((route) => `  <url>\n    <loc>https://www.hilover.space${route.path === '/' ? '/' : route.path}</loc>\n    <lastmod>${route.updatedAt ?? '2026-07-12'}</lastmod>\n  </url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(dist, 'sitemap.xml'), sitemap, 'utf8');

const notFound = cleanTemplate
  .replace('</head>', '<title>Không tìm thấy trang - HiLover</title>\n<meta name="robots" content="noindex, nofollow" />\n</head>')
  .replace('<div id="root"></div>', `<div id="root">${bundle.render('/404')}</div>`);
await writeFile(path.join(dist, '404.html'), notFound, 'utf8');

const publicPaths = bundle.indexableRoutes.map((route) => route.path);
const spaPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/connect', '/onboarding', '/female-dashboard', '/male-dashboard', '/settings', '/settings/notifications', '/male-settings/notifications', '/cycles', '/partner', '/payment', '/admin', '/dashboard', '/calendar', '/chat', '/products', '/couple-map', '/symptoms', '/notifications'];
const cloudFrontFunction = `function handler(event) {
  var request = event.request;
  var host = request.headers.host && request.headers.host.value;
  if (host && host !== 'www.hilover.space') {
    return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: 'https://www.hilover.space' + request.uri } } };
  }
  var uri = request.uri;
  if (uri.length > 1 && uri.endsWith('/')) {
    return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: 'https://www.hilover.space' + uri.slice(0, -1) } } };
  }
  var publicPaths = ${JSON.stringify(publicPaths)};
  if (publicPaths.indexOf(uri) !== -1) {
    request.uri = uri === '/' ? '/index.html' : uri + '/index.html';
    return request;
  }
  var spaPrefixes = ${JSON.stringify(spaPaths)};
  for (var i = 0; i < spaPrefixes.length; i++) {
    if (uri === spaPrefixes[i] || uri.indexOf(spaPrefixes[i] + '/') === 0) {
      request.uri = '/app-shell.html';
      return request;
    }
  }
  if (/\\.[a-zA-Z0-9]+$/.test(uri)) return request;
  return { statusCode: 404, statusDescription: 'Not Found', headers: { 'content-type': { value: 'text/html; charset=utf-8' }, 'cache-control': { value: 'public, max-age=300' } }, body: { encoding: 'text', data: '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Không tìm thấy trang - HiLover</title></head><body><main><h1>Không tìm thấy trang</h1><p>Đường dẫn này không tồn tại.</p><a href="https://www.hilover.space/">Về trang chủ</a></main></body></html>' } };
}`;
await writeFile(path.join(dist, 'cloudfront-viewer-request.js'), cloudFrontFunction, 'utf8');
await writeFile(path.join(dist, 'app-shell.html'), template, 'utf8');
await rm(path.join(root, 'dist-ssr'), { recursive: true, force: true });

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = 'http://127.0.0.1:5173';
const outDir = path.resolve('output/playwright');
fs.mkdirSync(outDir, { recursive: true });
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/terms', '/privacy', '/help'];
const blockedRoutes = [
  '/female-dashboard', '/cycles', '/calendar', '/chat', '/products', '/symptoms', '/notifications', '/settings', '/settings/notifications', '/partner',
  '/male-dashboard', '/male-settings/notifications', '/admin', '/payment/success', '/payment/cancel', '/onboarding'
];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

function slug(route) {
  return route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (const route of publicRoutes) {
      const errors = [];
      page.on('pageerror', err => errors.push(String(err.message || err)));
      let status = 'unknown';
      try {
        const response = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 20000 });
        status = response ? response.status() : 'no_response';
      } catch (err) {
        status = 'navigation_error';
        errors.push(String(err.message || err));
      }
      await page.waitForTimeout(600);
      const finalUrl = page.url();
      const title = await page.title().catch(() => '');
      const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
      const screenshot = path.join(outDir, `${vp.name}-${slug(route)}.png`);
      await page.screenshot({ path: screenshot, fullPage: true }).catch(err => errors.push(`screenshot: ${err.message || err}`));
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const all = Array.from(document.querySelectorAll('body *'));
        const viewportW = window.innerWidth;
        const overflow = all.filter(el => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 1 && r.height > 1 && cs.display !== 'none' && (r.right > viewportW + 2 || r.left < -2);
        }).slice(0, 8).map(el => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 120), text: (el.textContent || '').trim().slice(0, 80), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
        });
        const controls = Array.from(document.querySelectorAll('button, a, input, textarea, select, [role="button"]'));
        const tinyTargets = controls.filter(el => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && (r.width < 36 || r.height < 36);
        }).slice(0, 8).map(el => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName.toLowerCase(), text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 80), width: Math.round(r.width), height: Math.round(r.height) };
        });
        const lowContrastCandidates = all.filter(el => {
          const cs = getComputedStyle(el);
          const bg = cs.backgroundColor;
          const color = cs.color;
          const text = (el.textContent || '').trim();
          return text && /rgb\(100, 116, 139\)|rgb\(148, 163, 184\)|rgb\(71, 85, 105\)/.test(color) && !/rgba\(0, 0, 0, 0\)/.test(bg) && bg !== 'rgba(0, 0, 0, 0)';
        }).slice(0, 8).map(el => ({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 100), text: (el.textContent || '').trim().slice(0, 80), color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          horizontalOverflow: doc.scrollWidth > doc.clientWidth + 2,
          overflow,
          tinyTargets,
          lowContrastCandidates,
          h1: document.querySelector('h1')?.textContent?.trim().slice(0, 160) || '',
        };
      }).catch(err => ({ error: String(err.message || err) }));
      results.push({ route, viewport: vp, finalUrl, title, status, h1: metrics.h1, bodyLength: bodyText.length, errors, metrics, screenshot });
      page.removeAllListeners('pageerror');
    }
    await context.close();
  }
  for (const route of blockedRoutes) {
    for (const vp of viewports) {
      results.push({ route, viewport: vp, status: 'blocked_credentials_missing', note: 'Protected route requires female/male/admin test account or onboarding-specific user.' });
    }
  }
  await browser.close();
  const resultPath = path.join(outDir, 'ui-audit-results.json');
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: true, count: results.length, out: resultPath }, null, 2));
})();

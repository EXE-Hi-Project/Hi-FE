# SEO deployment runbook

## Build artifacts

Run `npm run build`. Besides the normal SPA assets, `dist/` must contain:

- one `index.html` for each public route;
- `app-shell.html` with `noindex, nofollow` for authenticated/private routes;
- `sitemap.xml` generated from the SEO route manifest;
- `404.html` and `cloudfront-viewer-request.js`.

Never configure CloudFront to return the public home page for every 403/404. That would make unknown URLs return a soft 404 with status 200 and would expose the home page canonical on application URLs.

## CloudFront and Route 53

1. Set the distribution alternate domain to `www.hilover.space` and attach the ACM certificate.
2. Redirect HTTP to HTTPS with the CloudFront viewer protocol policy.
3. Create or update a CloudFront Function from the generated `dist/cloudfront-viewer-request.js` and attach it to **Viewer request** on the default behavior.
4. Point both Route 53 records (`hilover.space` and `www.hilover.space`) at CloudFront. The generated function redirects the apex hostname to `www`.
5. Use long-lived immutable caching for `/assets/*`; use a short cache policy for HTML, sitemap and robots files.
6. Deploy with `aws s3 sync dist/ s3://hi-app-frontend --delete`, then invalidate `/*`.
7. Verify with `curl -I`: `/` returns 200, a knowledge article returns 200, a private route returns the app shell, an unknown path returns 404, and the apex hostname returns 301 to `www`.

The generated CloudFront Function contains the public-route allowlist from `src/seo/manifest.ts`. Publish the new function version whenever public routes change.

## Google Search Console

1. Add a Domain property for `hilover.space` and verify it using the DNS TXT record supplied by Search Console.
2. Submit `https://www.hilover.space/sitemap.xml`.
3. Inspect `/`, `/kien-thuc`, and at least one article. Confirm that the user-declared and Google-selected canonicals match.
4. Run Rich Results Test on an article and confirm `Article` plus `BreadcrumbList` parse without errors.
5. After each release, monitor Page indexing, HTTPS and Core Web Vitals. Investigate soft 404, duplicate canonical and crawled-not-indexed reports rather than repeatedly resubmitting URLs.
6. Record mobile field data targets: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at percentile 75.

## Editorial release checklist

- The title and description describe the page without exaggerated health claims.
- Every medical statement is supported by a linked primary or authoritative source.
- The article names its author/reviewer, update date and editorial limitations.
- The content does not diagnose, promise treatment or treat cycle prediction as contraception.
- A second team member checks the article before release.

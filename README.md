# Urdu AI Impact Site

Astro static site for `impact.urduai.org`.

## Content Rules

- Future article, CTA, brand, SEO, and AEO guidance lives in [`docs/editorial-notes.md`](docs/editorial-notes.md).
- Do not publish Phase 3 internal material.
- Use "reported learner records" or "training completions" unless a number is verified as unique beneficiaries.
- Keep the Phase 1 and Phase 2 reporting cutoffs distinct. The combined starts and completions in `src/data/impact.js` are self-reported sums, not donor-verified totals or counts of unique learners. Do not add the older September snapshot to them.
- Report women's share of completions as a percentage only. Do not reuse the earlier 51% participation figure as a completion share or publish raw gender counts in headline metrics.

## Images, Fonts, Headers

- Photos live in `src/assets/**` and are referenced from data files by their old public-style path (`/assets/showcase/x.jpg`). Render them with `src/components/Pic.astro`, which maps that path to the imported asset and emits an optimised WebP `<img>` with `srcset`, `sizes`, and intrinsic `width`/`height`. Drop new photos into `src/assets/**` (JPEG, ≤ 1800 px wide) and reference them the same way; never put photos back in `public/assets/`.
- Only the OG logo, the brand mark, and approved partner and recognition logos stay in `public/assets/`.
- Fonts are self-hosted in `public/fonts/` (variable Montserrat, variable Noto Nastaliq Urdu) and declared in `src/styles/global.css`. Do not re-add Google Fonts `<link>`s.
- `public/_headers` sets Cloudflare Pages caching and security headers (HSTS, nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy, one-year cache on `/_astro/*` and `/fonts/*`).
- `src/layouts/BaseLayout.astro` emits the site-wide Organization + WebSite JSON-LD; page templates add their own WebPage/Article nodes.

## Local Preview

```bash
npm install
npm run dev
```

## Cloudflare Pages

Survey gateway operations and private reporting setup: [`docs/survey-gateway.md`](docs/survey-gateway.md).

Build command: `npm run build`

Output directory: `dist`

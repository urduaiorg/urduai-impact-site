# Urdu AI Impact Site

Astro static site for `impact.urduai.org`.

## Content Rules

- Future article, CTA, brand, SEO, and AEO guidance lives in [`docs/editorial-notes.md`](docs/editorial-notes.md).
- Do not publish Phase 3 internal material.
- Use "reported learner records" or "training completions" unless a number is verified as unique beneficiaries.
- Current reported training total: `24,777` as of September 1, 2026. Keep historical figures labeled with their reporting period; do not add them to this cumulative total.
- Present women participation as `51%` on the public site. Do not show the raw female learner count in headline metrics.

## Local Preview

```bash
npm install
npm run dev
```

## Cloudflare Pages

Survey gateway operations and private reporting setup: [`docs/survey-gateway.md`](docs/survey-gateway.md).

Build command: `npm run build`

Output directory: `dist`

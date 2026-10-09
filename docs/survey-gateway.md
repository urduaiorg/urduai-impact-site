# Survey Gateway Operations

Participant page: `https://impact.urduai.org/surveys/`
Private reports: `https://impact.urduai.org/surveys/admin/`

## Records and reporting

- Names, facilitator IDs, survey IDs, UTC entry timestamps and the consent version are saved in `SURVEY_DB` before returning a redirect.
- The dashboard and CSV show date/time in Pakistan time (UTC+5). CSV also includes the original UTC timestamp and a submission reference.
- Retries with the same reference do not create new rows. Matching names on separate submissions are not automatically merged.
- These are participant-reported survey referrals, not verified attendance, unique beneficiaries or confirmed survey completions. Never add these counts automatically to the public impact numbers.
- The external Jotform URLs and existing WANG query parameters are kept server-side. Names are not sent to Jotform by this gateway.
- CSV exports respect active filters and permit at most 20,000 records per download. Use narrower date ranges for larger datasets.
- CSV fields are quoted, UTF-8 with BOM, and protected against spreadsheet formula injection.
- Participants can request correction or deletion through `ai@urduai.org`. Verify a request before changing records. Establish a retention period with the programme team.

## Cloudflare Access

Production configuration: Access application `f49dad96-b3f1-49a3-ad58-2dc4b4c88eac` (Urdu Ai Survey Reporting), team domain `shrill-frog-f789.cloudflareaccess.com`, policy `c94754c9-92be-4a92-88db-e4b8d999b396`. Both reporting paths are protected; the participant page remains public. Only the one-time PIN provider is enabled for this application. HTTP-only authentication cookies are enabled.

All reporting endpoints fail closed unless the Access issuer and application audience are configured. Never disable authentication to make a dashboard reachable.

1. Enable Cloudflare Access on the hosting account's Free plan.
2. Create one self-hosted Access application with both public hostname paths:
   - `impact.urduai.org/surveys/admin`
   - `impact.urduai.org/api/surveys/admin`
3. Include email one-time PIN as an identity provider. An Allow policy must include only `amir@urduai.org` and `qaisar@wang.org.pk`, with six-hour sessions.
4. Set `SURVEY_ACCESS_ISSUER` to `https://<team-name>.cloudflareaccess.com` and `SURVEY_ACCESS_AUD` to that application's audience tag, under production variables in `wrangler.toml`.
5. Redeploy. Check that authorized users can sign in, and unauthorized requests cannot read either JSON or CSV.

JWT signatures, audience, issuer, expiry and the email allowlist are independently verified in Pages Functions. Pages preview hostnames do not bypass this verification. Local testing uses generated test keys outside the repository; they must never be deployed.

## Deployment

```sh
npm ci
npm run build
npx wrangler d1 migrations apply urduai-survey-referrals --remote
npx wrangler pages deploy dist --project-name urduai-impact-site --branch main
```

Keep the `functions`, `server`, `shared`, `migrations` and Wrangler configuration directories/files with the source. Deploy from the repository root so Pages Functions are included; do not upload only the HTML directory through the dashboard.

The public intake validates allowed IDs, same-origin JSON submissions, names, consent and body size; a honeypot blocks basic automated form filling. This is not an anti-fraud system. Direct external survey links can still be shared and bypass attribution.

## Validation

Run `npm test` for the committed regression tests covering the facilitator/survey registry, Pakistan date boundaries, CSV safety, input validation, duplicate retries, failed saves and fail-closed authentication.

Local integration tests exercised all three exact redirects, server-side timestamps, duplicate retries, rejected payloads, forged/unauthorized JWTs, failed-save retry behavior, Pakistan date filters and Unicode-safe CSV exports. Browser checks covered 320, 390, 768 and 1440px. Live tests use only invalid submissions until authenticated reporting is enabled; do not pollute production with synthetic participant records.

Production checks passed for the public form at 390 and 1440px, rejected invalid intake without saving a row, and confirmed that the dashboard, records and CSV endpoints redirect unauthenticated visitors to Access. On 9 October 2026, real email-code sign-in for `qaisar@wang.org.pk` succeeded in Safari. The dashboard displayed four existing entries, and the downloaded CSV contained all four records with facilitator, bilingual survey, Pakistan date/time, UTC timestamp and reference fields. No production authentication bypass or synthetic participant record was used. The second authorized email remains configured but was not separately signed in during validation.

The existing Astro build toolchain has npm audit advisories. Review and upgrade it separately rather than applying a forced major-version update during a reporting deployment.

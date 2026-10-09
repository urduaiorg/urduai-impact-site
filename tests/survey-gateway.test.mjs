import test from "node:test";
import assert from "node:assert/strict";
import { facilitators, surveyChoices } from "../shared/surveys.js";
import { filters, csvCell } from "../server/survey-common.js";
import { destinations } from "../server/survey-destinations.js";
import { authorize } from "../server/survey-auth.js";
import { onRequest } from "../functions/api/surveys/start.js";

const origin = "https://impact.urduai.org";
const details = () => ({ name: "عائشہ", facilitator: facilitators[0].id, survey: "pre", consent: true, requestId: crypto.randomUUID(), website: "" });
const request = (body, overrides = {}) => new Request(`${origin}/api/surveys/start`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body), ...overrides });

function database() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return { bind(...values) {
        return {
          async run() {
            assert.match(sql, /^INSERT/);
            const [id, participant_name, facilitator_id, survey_id, created_at, consent_version] = values;
            if (!rows.has(id)) rows.set(id, { participant_name, facilitator_id, survey_id, created_at, consent_version });
          },
          async first() { return rows.get(values[0]); }
        };
      } };
    }
  };
}

test("all 24 facilitators have unique IDs and three bilingual surveys", () => {
  assert.equal(facilitators.length, 24);
  assert.equal(new Set(facilitators.map(item => item.id)).size, 24);
  assert.equal(surveyChoices.length, 3);
  for (const item of surveyChoices) {
    assert.ok(item.en && /[\u0600-\u06ff]/u.test(item.ur));
    const url = new URL(destinations[item.id]);
    assert.equal(url.origin, "https://tsic.jotform.com");
    assert.equal([...url.searchParams.values()][0], "Welfare Association for New Generation (WANG)");
  }
});

test("Pakistan date filters use exclusive next-day boundaries", () => {
  assert.deepEqual(filters(new URL(`${origin}/?from=2026-10-09&to=2026-10-09`)), {
    where: "WHERE created_at >= ? AND created_at < ?",
    values: ["2026-10-08T19:00:00.000Z", "2026-10-09T19:00:00.000Z"]
  });
  for (const query of ["from=2026-02-30", "from=2026-10-10&to=2026-10-09", "facilitator=unknown", "survey=unknown"]) {
    assert.throws(() => filters(new URL(`${origin}/?${query}`)), /Invalid/);
  }
});

test("CSV handles Urdu, embedded quotes and spreadsheet formulas", () => {
  assert.equal(csvCell('عائشہ "خان"'), '"عائشہ ""خان"""');
  for (const value of ["=1+1", "+SUM(A1)", "@SUM(A1)", "-1", "  =1"]) assert.ok(csvCell(value).startsWith('"\''));
});

test("save precedes redirect, timestamps are automatic, retries are idempotent", async () => {
  const db = database();
  const body = details();
  const before = Date.now();
  const responses = await Promise.all(Array.from({ length: 4 }, () => onRequest({ request: request(body), env: { SURVEY_DB: db } })));
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { saved: true, redirect: destinations.pre });
  }
  assert.equal(db.rows.size, 1);
  assert.ok(Date.parse(db.rows.get(body.requestId).created_at) >= before);
  assert.equal((await onRequest({ request: request({ ...body, name: "Different person" }), env: { SURVEY_DB: db } })).status, 409);
});

test("invalid payloads and cross-origin requests do not save entries", async () => {
  const db = database();
  for (const body of [null, [], { ...details(), consent: false }, { ...details(), name: "" }, { ...details(), facilitator: "unknown" }, { ...details(), survey: "unknown" }, { ...details(), website: "spam" }]) {
    assert.equal((await onRequest({ request: request(body), env: { SURVEY_DB: db } })).status, 400);
  }
  assert.equal((await onRequest({ request: request(details(), { headers: { Origin: "https://other.example", "Content-Type": "application/json" } }), env: { SURVEY_DB: db } })).status, 403);
  assert.equal((await onRequest({ request: request({ ...details(), name: "x".repeat(5000) }), env: { SURVEY_DB: db } })).status, 413);
  assert.equal(db.rows.size, 0);
});

test("a failed save never provides an external redirect", async () => {
  const response = await onRequest({ request: request(details()), env: { SURVEY_DB: { prepare() { throw new Error("Database unavailable"); } } } });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).redirect, undefined);
});

test("reporting fails closed when authentication is missing", async () => {
  const req = new Request(`${origin}/api/surveys/admin/records`);
  assert.equal((await authorize(req, {})).error.status, 503);
  assert.equal((await authorize(req, { SURVEY_ACCESS_ISSUER: "https://example.cloudflareaccess.com", SURVEY_ACCESS_AUD: "test" })).error.status, 401);
});

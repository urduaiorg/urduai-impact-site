import { consentVersion } from "../../../shared/surveys.js";
import { destinations } from "../../../server/survey-destinations.js";
import { facilitatorNames, json } from "../../../server/survey-common.js";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) return json({ error: "Please start from the Urdu Ai survey page." }, 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) return json({ error: "Invalid request." }, 415);
  if (!env.SURVEY_DB) return json({ error: "Saving is temporarily unavailable. Please try again." }, 503);
  try {
    if (!request.body) return json({ error: "Invalid request." }, 400);
    const reader = request.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return json({ error: "Request too large." }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder().decode(bytes);
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request." }, 400);
    const name = typeof body.name === "string" ? body.name.normalize("NFC").trim().replace(/\s+/g, " ") : "";
    const id = body.requestId;
    if (!name || name.length > 120 || !/[\p{L}\p{N}]/u.test(name) || /[\p{Cc}\p{Cf}]/u.test(name)) return json({ error: "Enter a valid name (up to 120 characters)." }, 400);
    if (!Object.hasOwn(facilitatorNames, body.facilitator) || !Object.hasOwn(destinations, body.survey)) return json({ error: "Choose a facilitator and survey from the list." }, 400);
    if (body.consent !== true || body.website || typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json({ error: "Please check your details and consent." }, 400);
    const createdAt = new Date().toISOString();
    await env.SURVEY_DB.prepare("INSERT INTO survey_referrals (id, participant_name, facilitator_id, survey_id, created_at, consent_version) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
      .bind(id, name, body.facilitator, body.survey, createdAt, consentVersion).run();
    const stored = await env.SURVEY_DB.prepare("SELECT participant_name, facilitator_id, survey_id FROM survey_referrals WHERE id = ?").bind(id).first();
    if (!stored || stored.participant_name !== name || stored.facilitator_id !== body.facilitator || stored.survey_id !== body.survey) return json({ error: "Your details changed. Please submit again." }, 409);
    return json({ saved: true, redirect: destinations[body.survey] });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Invalid request." }, 400);
    return json({ error: "We could not save your entry. Please try again before opening the survey." }, 503);
  }
}

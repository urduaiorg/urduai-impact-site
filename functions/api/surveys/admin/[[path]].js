import { authorize } from "../../../../server/survey-auth.js";
import { facilitatorNames, surveyNames, filters, csvCell, json, privateHeaders } from "../../../../server/survey-common.js";

export async function onRequest({ request, env }) {
  const access = await authorize(request, env);
  if (access.error) return access.error;
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!env.SURVEY_DB) return json({ error: "Database unavailable." }, 503);
  const url = new URL(request.url);
  try {
    const { where, values } = filters(url);
    const count = await env.SURVEY_DB.prepare(`SELECT COUNT(*) AS total FROM survey_referrals ${where}`).bind(...values).first();
    if (url.pathname.endsWith("/export")) {
      if (count.total > 20000) return json({ error: "Narrow the date range to export at most 20,000 entries at a time." }, 422);
      const { results } = await env.SURVEY_DB.prepare(`SELECT * FROM survey_referrals ${where} ORDER BY created_at DESC, id DESC LIMIT 20000`).bind(...values).all();
      const rows = [["Participant name", "Facilitator", "Survey", "Entry date (Pakistan)", "Entry time (Pakistan)", "Entry timestamp (UTC)", "Reference"]];
      for (const row of results) {
        const local = new Date(Date.parse(row.created_at) + 18000000).toISOString();
        rows.push([row.participant_name, facilitatorNames[row.facilitator_id] ?? row.facilitator_id, surveyNames[row.survey_id] ?? row.survey_id, local.slice(0, 10), local.slice(11, 19), row.created_at, row.id]);
      }
      return new Response("\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n"), {
        headers: { ...privateHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="urduai-survey-entries-${new Date().toISOString().slice(0, 10)}.csv"` }
      });
    }
    if (!url.pathname.endsWith("/records")) return json({ error: "Not found." }, 404);
    const page = Number(url.searchParams.get("page") || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) return json({ error: "Invalid page." }, 400);
    const responses = await env.SURVEY_DB.batch([
      env.SURVEY_DB.prepare(`SELECT * FROM survey_referrals ${where} ORDER BY created_at DESC, id DESC LIMIT 50 OFFSET ?`).bind(...values, (page - 1) * 50),
      env.SURVEY_DB.prepare(`SELECT facilitator_id, COUNT(*) AS total FROM survey_referrals ${where} GROUP BY facilitator_id ORDER BY total DESC, facilitator_id`).bind(...values),
      env.SURVEY_DB.prepare(`SELECT survey_id, COUNT(*) AS total FROM survey_referrals ${where} GROUP BY survey_id`).bind(...values)
    ]);
    return json({ total: count.total, page, pageSize: 50, records: responses[0].results, facilitators: responses[1].results, surveys: responses[2].results, email: access.email });
  } catch (error) {
    return json({ error: error.message.startsWith("Invalid") ? error.message : "Could not load records. Please try again." }, error.message.startsWith("Invalid") ? 400 : 503);
  }
}

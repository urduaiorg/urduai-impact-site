import { facilitators, surveyChoices } from "../shared/surveys.js";

export const facilitatorNames = Object.fromEntries(facilitators.map(item => [item.id, item.name]));
export const surveyNames = Object.fromEntries(surveyChoices.map(item => [item.id, `${item.en} / ${item.ur}`]));
export const privateHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer"
};

export function json(body, status = 200) {
  return Response.json(body, { status, headers: privateHeaders });
}

export function filters(url) {
  const parts = [];
  const values = [];
  for (const [parameter, column, allowed] of [
    ["facilitator", "facilitator_id", facilitatorNames],
    ["survey", "survey_id", surveyNames]
  ]) {
    const value = url.searchParams.get(parameter);
    if (value) {
      if (!Object.hasOwn(allowed, value)) throw new Error("Invalid filter");
      parts.push(`${column} = ?`);
      values.push(value);
    }
  }
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) throw new Error("Invalid date range");
  // Reporting boundaries use Pakistan local dates; stored timestamps remain UTC.
  if (from) { parts.push("created_at >= ?"); values.push(new Date(`${from}T00:00:00+05:00`).toISOString()); }
  if (to) { parts.push("created_at < ?"); values.push(new Date(Date.parse(`${to}T00:00:00+05:00`) + 86400000).toISOString()); }
  return { where: parts.length ? `WHERE ${parts.join(" AND ")}` : "", values };
}

export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

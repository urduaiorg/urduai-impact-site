import { createRemoteJWKSet, jwtVerify } from "jose";
import { json } from "./survey-common.js";

const allowedEmails = new Set(["amir@urduai.org", "qaisar@wang.org.pk"]);
const keySets = new Map();

export async function authorize(request, env) {
  const issuer = env.SURVEY_ACCESS_ISSUER;
  const audience = env.SURVEY_ACCESS_AUD;
  if (!issuer || !audience) return { error: json({ error: "Private reporting access is not configured yet." }, 503) };
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return { error: json({ error: "Sign in with an authorized team email." }, 401) };
  try {
    if (!keySets.has(issuer)) keySets.set(issuer, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
    const { payload } = await jwtVerify(token, keySets.get(issuer), { issuer, audience, algorithms: ["RS256"] });
    if (!allowedEmails.has(String(payload.email).toLowerCase())) return { error: json({ error: "Access denied." }, 403) };
    return { email: payload.email };
  } catch {
    return { error: json({ error: "Your sign-in has expired. Please sign in again." }, 401) };
  }
}

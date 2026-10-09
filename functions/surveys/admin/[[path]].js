import { authorize } from "../../../server/survey-auth.js";
import { privateHeaders } from "../../../server/survey-common.js";

export async function onRequest({ request, env }) {
  const result = await authorize(request, env);
  if (result.error) return result.error;
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  Object.entries(privateHeaders).forEach(([name, value]) => headers.set(name, value));
  return new Response(response.body, { status: response.status, headers });
}

import { approvedCustomUrl, evaluateNumericRule } from "@/lib/provider-verification";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { url?: unknown; rule?: unknown };
  const allowlist = (process.env.MONCAST_CUSTOM_API_ALLOWLIST ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const endpoint = approvedCustomUrl(body.url, allowlist);
  if (!endpoint) return Response.json({ error: "URL_NOT_APPROVED" }, { status: 400 });
  if (typeof body.rule !== "string" || body.rule.length > 160) return Response.json({ error: "INVALID_RULE" }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(endpoint, { method: "GET", headers: { accept: "application/json" }, cache: "no-store", redirect: "error", signal: controller.signal });
    if (!response.ok) return Response.json({ error: "PROVIDER_UNAVAILABLE" }, { status: 502 });
    const raw = await response.text();
    if (raw.length > 262_144) return Response.json({ error: "RESPONSE_TOO_LARGE" }, { status: 413 });
    const payload = JSON.parse(raw) as unknown;
    const evaluation = evaluateNumericRule(payload, body.rule);
    if (!evaluation.valid) return Response.json({ error: "INVALID_RULE" }, { status: 400 });
    return Response.json({ verified: true, passed: evaluation.passed, actual: evaluation.actual, source: endpoint.origin });
  } catch {
    return Response.json({ error: "PROVIDER_TIMEOUT" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}

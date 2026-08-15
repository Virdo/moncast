import { fetchDuolingoProfile } from "@/lib/platform-verification";
import { validProviderHandle } from "@/lib/provider-verification";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { username?: unknown; utcOffsetMinutes?: unknown };
  if (!validProviderHandle(body.username)) return Response.json({ error: "INVALID_USERNAME" }, { status: 400 });

  try {
    const profile = await fetchDuolingoProfile(body.username, body.utcOffsetMinutes);
    if (!profile) return Response.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
    return Response.json({ verified: true, profile });
  } catch {
    return Response.json({ error: "PROVIDER_UNAVAILABLE" }, { status: 502 });
  }
}

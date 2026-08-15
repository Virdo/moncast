import type { Address } from "viem";
import { createCompletionAttestation } from "@/lib/server/attestation";
import { validProviderHandle } from "@/lib/provider-verification";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { pactId?: unknown; participant?: unknown; platform?: unknown; username?: unknown };
  if (!/^\d+$/.test(String(body.pactId ?? "")) || typeof body.participant !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(body.participant)
    || (body.platform !== "leetcode" && body.platform !== "duolingo") || !validProviderHandle(body.username)) {
    return Response.json({ error: "INVALID_PROOF_REQUEST" }, { status: 400 });
  }
  try {
    const result = await createCompletionAttestation({
      pactId: String(body.pactId), participant: body.participant as Address, platform: body.platform, username: body.username,
    });
    return Response.json({ ...result, epoch: result.epoch.toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROOF_FAILED";
    const status = message === "TARGET_NOT_COMPLETED" ? 422 : message === "ALREADY_COMPLETED" ? 409 : 503;
    return Response.json({ error: message }, { status });
  }
}

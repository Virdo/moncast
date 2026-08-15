import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import { moncastAddress } from "@/lib/moncast-chain";
import { findPact } from "@/lib/server/registry";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { pactId?: unknown; code?: unknown; participant?: unknown };
  const pactId = String(body.pactId ?? "");
  const participant = String(body.participant ?? "") as Address;
  if (!/^\d+$/.test(pactId) || !/^0x[a-fA-F0-9]{40}$/.test(participant) || typeof body.code !== "string") {
    return Response.json({ error: "INVALID_INVITE_REQUEST" }, { status: 400 });
  }
  const privateKey = process.env.ATTESTOR_PRIVATE_KEY as Hex | undefined;
  if (!privateKey || !moncastAddress) return Response.json({ error: "INVITE_SIGNER_NOT_CONFIGURED" }, { status: 503 });
  const pact = await findPact(moncastAddress, pactId);
  if (!pact?.isPrivate || !pact.inviteCode || pact.inviteCode !== body.code || Date.now() / 1000 >= pact.recruitmentEndsAt) {
    return Response.json({ error: "INVITE_INVALID_OR_EXPIRED" }, { status: 404 });
  }

  const nonce = BigInt(`0x${randomBytes(32).toString("hex")}`);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);
  const signature = await privateKeyToAccount(privateKey).signTypedData({
    domain: { name: "Moncast", version: "1", chainId: 10_143, verifyingContract: moncastAddress },
    types: { Invite: [
      { name: "pactId", type: "uint256" }, { name: "participant", type: "address" },
      { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
    ] },
    primaryType: "Invite",
    message: { pactId: BigInt(pactId), participant, nonce, deadline },
  });
  return Response.json({ nonce: nonce.toString(), deadline: deadline.toString(), signature });
}

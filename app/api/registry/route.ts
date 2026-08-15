import { parseEventLogs, type Address, type Hash } from "viem";
import { moncastAddress, protocolAbi, publicClient } from "@/lib/moncast-chain";
import { readProtocolPacts, registerMember, registerPact, type RegisteredPact } from "@/lib/server/registry";
import { validProviderHandle } from "@/lib/provider-verification";
import { validStakeAmount } from "@/lib/stake";

function address(value: unknown): value is Address {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function hash(value: unknown): value is Hash {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

async function receiptHas(eventName: "PactCreated" | "MemberEnrolled", transactionHash: Hash, pactId: bigint, participant: Address) {
  const configuredProtocol = moncastAddress;
  if (!configuredProtocol) return false;
  const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
  if (eventName === "PactCreated") {
    const logs = parseEventLogs({ abi: protocolAbi, logs: receipt.logs, eventName: "PactCreated", strict: true });
    return logs.some((log) => log.address.toLowerCase() === configuredProtocol.toLowerCase()
      && log.args.pactId === pactId && log.args.creator.toLowerCase() === participant.toLowerCase());
  }
  const logs = parseEventLogs({ abi: protocolAbi, logs: receipt.logs, eventName: "MemberEnrolled", strict: true });
  return logs.some((log) => log.address.toLowerCase() === configuredProtocol.toLowerCase()
    && log.args.pactId === pactId && log.args.participant.toLowerCase() === participant.toLowerCase());
}

export async function GET() {
  if (!moncastAddress) return Response.json({ pacts: [] });
  const pacts = await readProtocolPacts(moncastAddress);
  return Response.json({ pacts: pacts.map((pact) => Object.fromEntries(Object.entries(pact).filter(([key]) => key !== "inviteCode"))) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = body.action;
  if (!hash(body.transactionHash) || !address(body.address) || !/^\d+$/.test(String(body.pactId ?? ""))) {
    return Response.json({ error: "INVALID_REGISTRATION" }, { status: 400 });
  }
  const pactId = BigInt(String(body.pactId));
  if (!moncastAddress) return Response.json({ error: "CONTRACT_NOT_CONFIGURED" }, { status: 503 });

  if (action === "pact") {
    if (!await receiptHas("PactCreated", body.transactionHash, pactId, body.address)) {
      return Response.json({ error: "PACT_EVENT_NOT_FOUND" }, { status: 400 });
    }
    const platform = body.platform;
    if (platform !== "leetcode" && platform !== "duolingo" && platform !== "custom") {
      return Response.json({ error: "INVALID_PLATFORM" }, { status: 400 });
    }
    if (platform !== "custom" && !validProviderHandle(body.username)) {
      return Response.json({ error: "INVALID_USERNAME" }, { status: 400 });
    }
    const stake = Number(body.stake);
    if (!validStakeAmount(stake)) return Response.json({ error: "INVALID_STAKE" }, { status: 400 });
    const registered: RegisteredPact = {
      protocolAddress: moncastAddress, id: String(pactId), creator: body.address, title: String(body.title ?? "未命名契约").slice(0, 48),
      description: String(body.description ?? "").slice(0, 240), platform,
      rule: String(body.rule ?? "").slice(0, 160), durationDays: Number(body.durationDays) as 7 | 14 | 30,
      recruitmentDays: Math.min(7, Math.max(1, Number(body.recruitmentDays))),
      recruitmentEndsAt: Number(body.recruitmentEndsAt), stake,
      maxMembers: Number(body.maxMembers), utcOffsetMinutes: Number(body.utcOffsetMinutes) || 480,
      isPrivate: Boolean(body.isPrivate), inviteCode: typeof body.inviteCode === "string" ? body.inviteCode.slice(0, 64) : undefined,
      createdTx: body.transactionHash,
      members: platform === "custom" ? [] : [{ address: body.address, username: String(body.username), joinedTx: body.transactionHash }],
    };
    await registerPact(registered);
    return Response.json({ registered: true, pact: { ...registered, inviteCode: undefined } });
  }

  if (action === "member" && validProviderHandle(body.username)) {
    if (!await receiptHas("MemberEnrolled", body.transactionHash, pactId, body.address)) {
      return Response.json({ error: "MEMBER_EVENT_NOT_FOUND" }, { status: 400 });
    }
    const pact = await registerMember(moncastAddress, String(pactId), { address: body.address, username: body.username, joinedTx: body.transactionHash });
    return pact ? Response.json({ registered: true }) : Response.json({ error: "PACT_NOT_FOUND" }, { status: 404 });
  }
  return Response.json({ error: "INVALID_ACTION" }, { status: 400 });
}

import { createWalletClient, encodeFunctionData, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, moncastAddress, protocolAbi, publicClient } from "@/lib/moncast-chain";
import { createCompletionAttestation } from "@/lib/server/attestation";
import { readRegistry } from "@/lib/server/registry";

function localHour(offsetMinutes: number) {
  return new Date(Date.now() + offsetMinutes * 60_000).getUTCHours();
}

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret || request.headers.get("authorization") !== `Bearer ${configuredSecret}`) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const relayerKey = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!relayerKey || !moncastAddress) return Response.json({ error: "RELAYER_NOT_CONFIGURED" }, { status: 503 });
  const account = privateKeyToAccount(relayerKey);
  const wallet = createWalletClient({ account, chain: monadTestnet, transport: http(monadTestnet.rpcUrls.default.http[0]) });
  const registry = await readRegistry();
  const results: Array<Record<string, unknown>> = [];

  for (const pact of registry.pacts) {
    if (pact.recruitmentEndsAt <= Date.now() / 1000) {
      try {
        const state = await publicClient.readContract({ address: moncastAddress, abi: protocolAbi, functionName: "pacts", args: [BigInt(pact.id)], blockTag: "safe" });
        const status = Number(state[21]);
        if (status === 1 || status === 2) {
          const data = encodeFunctionData({ abi: protocolAbi, functionName: "activateMembers", args: [BigInt(pact.id), 24] });
          const estimate = await publicClient.estimateGas({ account: account.address, to: moncastAddress, data });
          const hash = await wallet.sendTransaction({ to: moncastAddress, data, gas: estimate + estimate / 10n });
          await publicClient.waitForTransactionReceipt({ hash, confirmations: 4 });
          results.push({ pactId: pact.id, action: "activate", hash });
        }
      } catch (error) {
        results.push({ pactId: pact.id, action: "activate", skipped: error instanceof Error ? error.message : "FAILED" });
      }
    }

    if (localHour(pact.utcOffsetMinutes) !== 23 || pact.platform === "custom") continue;
    for (const member of pact.members) {
      try {
        const attestation = await createCompletionAttestation({
          pactId: pact.id, participant: member.address as Address, platform: pact.platform, username: member.username,
        });
        const data = encodeFunctionData({ abi: protocolAbi, functionName: "completeFor", args: [
          BigInt(pact.id), member.address, attestation.epoch, attestation.nullifier, attestation.publicInputsHash, attestation.proof,
        ] });
        const estimate = await publicClient.estimateGas({ account: account.address, to: moncastAddress, data });
        const hash = await wallet.sendTransaction({ to: moncastAddress, data, gas: estimate + estimate / 10n });
        await publicClient.waitForTransactionReceipt({ hash, confirmations: 4 });
        results.push({ pactId: pact.id, participant: member.address, action: "complete", hash });
      } catch (error) {
        results.push({ pactId: pact.id, participant: member.address, action: "complete", skipped: error instanceof Error ? error.message : "FAILED" });
      }
    }
  }
  return Response.json({ checkedAt: new Date().toISOString(), results });
}

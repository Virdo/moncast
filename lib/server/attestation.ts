import { encodeAbiParameters, keccak256, parseAbiParameters, stringToHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { commitmentHash, moncastAddress, protocolAbi, publicClient } from "../moncast-chain";
import { verifyPlatformToday, type Platform } from "../platform-verification";

const platformRules: Record<Platform, string> = {
  leetcode: "每日 AC ≥ 1",
  duolingo: "每日完成 ≥ 1 次学习并延续连胜",
};

export async function createCompletionAttestation(input: {
  pactId: string;
  participant: Address;
  platform: Platform;
  username: string;
}) {
  if (!moncastAddress) throw new Error("CONTRACT_NOT_CONFIGURED");
  const configuredPrivateKey = process.env.ATTESTOR_PRIVATE_KEY;
  if (!configuredPrivateKey || !/^0x[a-fA-F0-9]{64}$/.test(configuredPrivateKey)) {
    throw new Error("ATTESTOR_NOT_CONFIGURED");
  }
  const privateKey = configuredPrivateKey as Hex;
  const [[epoch, completionOpen], pactState, memberState] = await Promise.all([
    publicClient.readContract({ address: moncastAddress, abi: protocolAbi, functionName: "currentEpoch", args: [BigInt(input.pactId)], blockTag: "safe" }),
    publicClient.readContract({ address: moncastAddress, abi: protocolAbi, functionName: "pacts", args: [BigInt(input.pactId)], blockTag: "safe" }),
    publicClient.readContract({ address: moncastAddress, abi: protocolAbi, functionName: "members", args: [BigInt(input.pactId), input.participant], blockTag: "safe" }),
  ]);
  if (Number(memberState[3]) !== 2) throw new Error("NOT_ACTIVE_MEMBER");
  const expectedRuleHash = commitmentHash({ rule: platformRules[input.platform], apiOrigin: input.platform });
  if (pactState[3].toLowerCase() !== expectedRuleHash.toLowerCase()) throw new Error("RULE_MISMATCH");
  if (!completionOpen) throw new Error("COMPLETION_WINDOW_CLOSED");
  const alreadyCompleted = await publicClient.readContract({
    address: moncastAddress, abi: protocolAbi, functionName: "completedEpoch",
    args: [BigInt(input.pactId), input.participant, epoch], blockTag: "safe",
  });
  if (alreadyCompleted) throw new Error("ALREADY_COMPLETED");

  const { profile, passed } = await verifyPlatformToday(input.platform, input.username, pactState[19]);
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  if (!passed) throw new Error("TARGET_NOT_COMPLETED");

  const observedAt = BigInt(Math.floor(Date.now() / 1000));
  const publicInputsHash = keccak256(encodeAbiParameters(
    parseAbiParameters("bytes32 ruleHash,bytes32 platformHash,bytes32 usernameHash,uint32 epoch,uint64 observedAt,uint256 total,uint256 streak"),
    [pactState[3], keccak256(stringToHex(input.platform)), keccak256(stringToHex(input.username)), epoch, observedAt, BigInt(profile.total), BigInt(profile.streak)],
  ));
  const nullifier = keccak256(encodeAbiParameters(
    parseAbiParameters("uint256 chainId,address protocol,uint256 pactId,address participant,uint32 epoch,bytes32 publicInputsHash"),
    [10_143n, moncastAddress, BigInt(input.pactId), input.participant, epoch, publicInputsHash],
  ));
  const payload = keccak256(encodeAbiParameters(
    parseAbiParameters("uint256 chainId,address protocol,uint256 pactId,address participant,uint32 epoch,bytes32 nullifier,bytes32 publicInputsHash"),
    [10_143n, moncastAddress, BigInt(input.pactId), input.participant, epoch, nullifier, publicInputsHash],
  ));
  const proof = await privateKeyToAccount(privateKey).signMessage({ message: { raw: payload } });
  return { epoch, nullifier, publicInputsHash, proof, profile };
}

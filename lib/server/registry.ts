import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Address, Hash } from "viem";

export type AutomationMember = {
  address: Address;
  username: string;
  joinedTx: Hash;
};

export type RegisteredPact = {
  protocolAddress: Address;
  id: string;
  creator: Address;
  title: string;
  description: string;
  platform: "leetcode" | "duolingo" | "custom";
  rule: string;
  durationDays: 7 | 14 | 30;
  recruitmentDays: number;
  recruitmentEndsAt: number;
  stake: number;
  maxMembers: number;
  utcOffsetMinutes: number;
  isPrivate: boolean;
  inviteCode?: string;
  createdTx: Hash;
  members: AutomationMember[];
};

type StoredPact = Omit<RegisteredPact, "protocolAddress"> & { protocolAddress?: Address };
type Registry = { version: 1; pacts: StoredPact[] };

const bundledRegistryPath = resolve(process.cwd(), "data", "automation-registry.json");
// Vercel's deployed bundle is read-only. /tmp keeps best-effort warm-instance
// registration while the browser-held registry remains the durable demo store.
const registryPath = process.env.VERCEL
  ? resolve("/tmp", "moncast-automation-registry.json")
  : bundledRegistryPath;
const emptyRegistry: Registry = { version: 1, pacts: [] };

export async function readRegistry(): Promise<Registry> {
  try {
    const value = JSON.parse(await readFile(registryPath, "utf8")) as Registry;
    return value.version === 1 && Array.isArray(value.pacts) ? value : emptyRegistry;
  } catch {
    if (registryPath !== bundledRegistryPath) {
      try {
        const bundled = JSON.parse(await readFile(bundledRegistryPath, "utf8")) as Registry;
        if (bundled.version === 1 && Array.isArray(bundled.pacts)) return bundled;
      } catch {
        // Continue with an empty registry; callers can still reconstruct chain state.
      }
    }
    return { ...emptyRegistry, pacts: [] };
  }
}

export function pactsForProtocol(registry: Registry, protocolAddress: Address): RegisteredPact[] {
  const expected = protocolAddress.toLowerCase();
  return registry.pacts.filter((pact): pact is RegisteredPact =>
    typeof pact.protocolAddress === "string" && pact.protocolAddress.toLowerCase() === expected,
  );
}

export async function readProtocolPacts(protocolAddress: Address) {
  return pactsForProtocol(await readRegistry(), protocolAddress);
}

async function writeRegistry(value: Registry) {
  await mkdir(dirname(registryPath), { recursive: true });
  const temporary = `${registryPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, registryPath);
}

export async function registerPact(pact: RegisteredPact) {
  const registry = await readRegistry();
  const index = registry.pacts.findIndex((item) => item.id === pact.id
    && item.protocolAddress?.toLowerCase() === pact.protocolAddress.toLowerCase());
  if (index >= 0) registry.pacts[index] = pact;
  else registry.pacts.push(pact);
  await writeRegistry(registry);
  return pact;
}

export async function registerMember(protocolAddress: Address, pactId: string, member: AutomationMember) {
  const registry = await readRegistry();
  const pact = registry.pacts.find((item) => item.id === pactId
    && item.protocolAddress?.toLowerCase() === protocolAddress.toLowerCase());
  if (!pact) return null;
  const index = pact.members.findIndex((item) => item.address.toLowerCase() === member.address.toLowerCase());
  if (index >= 0) pact.members[index] = member;
  else pact.members.push(member);
  await writeRegistry(registry);
  return pact;
}

export async function findPact(protocolAddress: Address, id: string) {
  return (await readProtocolPacts(protocolAddress)).find((pact) => pact.id === id) ?? null;
}

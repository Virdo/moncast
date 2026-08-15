import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Address, Hash } from "viem";

export type AutomationMember = {
  address: Address;
  username: string;
  joinedTx: Hash;
};

export type RegisteredPact = {
  id: string;
  creator: Address;
  title: string;
  description: string;
  platform: "leetcode" | "duolingo" | "custom";
  rule: string;
  durationDays: 7 | 14 | 30;
  recruitmentDays: number;
  recruitmentEndsAt: number;
  stake: 30 | 50 | 100 | 200;
  maxMembers: number;
  utcOffsetMinutes: number;
  isPrivate: boolean;
  inviteCode?: string;
  createdTx: Hash;
  members: AutomationMember[];
};

type Registry = { version: 1; pacts: RegisteredPact[] };

const registryPath = resolve(process.cwd(), "data", "automation-registry.json");
const emptyRegistry: Registry = { version: 1, pacts: [] };

export async function readRegistry(): Promise<Registry> {
  try {
    const value = JSON.parse(await readFile(registryPath, "utf8")) as Registry;
    return value.version === 1 && Array.isArray(value.pacts) ? value : emptyRegistry;
  } catch {
    return { ...emptyRegistry, pacts: [] };
  }
}

async function writeRegistry(value: Registry) {
  await mkdir(dirname(registryPath), { recursive: true });
  const temporary = `${registryPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, registryPath);
}

export async function registerPact(pact: RegisteredPact) {
  const registry = await readRegistry();
  const index = registry.pacts.findIndex((item) => item.id === pact.id);
  if (index >= 0) registry.pacts[index] = pact;
  else registry.pacts.push(pact);
  await writeRegistry(registry);
  return pact;
}

export async function registerMember(pactId: string, member: AutomationMember) {
  const registry = await readRegistry();
  const pact = registry.pacts.find((item) => item.id === pactId);
  if (!pact) return null;
  const index = pact.members.findIndex((item) => item.address.toLowerCase() === member.address.toLowerCase());
  if (index >= 0) pact.members[index] = member;
  else pact.members.push(member);
  await writeRegistry(registry);
  return pact;
}

export async function findPact(id: string) {
  return (await readRegistry()).pacts.find((pact) => pact.id === id) ?? null;
}

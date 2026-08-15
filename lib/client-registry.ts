"use client";

import type { Address } from "viem";
import type { RegistryPact } from "./registry-types";

function storageKey(protocolAddress: Address) {
  return `moncast:local-registry:v1:${protocolAddress.toLowerCase()}`;
}

function isPact(value: unknown, protocolAddress: Address): value is RegistryPact {
  if (!value || typeof value !== "object") return false;
  const pact = value as Partial<RegistryPact>;
  return pact.protocolAddress?.toLowerCase() === protocolAddress.toLowerCase()
    && typeof pact.id === "string"
    && /^0x[a-fA-F0-9]{40}$/.test(pact.creator ?? "")
    && Array.isArray(pact.members);
}

export function readLocalPacts(protocolAddress: Address): RegistryPact[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(protocolAddress)) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((pact) => isPact(pact, protocolAddress)) : [];
  } catch {
    return [];
  }
}

export function mergeRegistryPacts(...sources: RegistryPact[][]) {
  const merged = new Map<string, RegistryPact>();
  for (const source of sources) {
    for (const pact of source) {
      const key = `${pact.protocolAddress.toLowerCase()}:${pact.id}`;
      const previous = merged.get(key);
      const members = new Map<string, RegistryPact["members"][number]>();
      for (const member of previous?.members ?? []) members.set(member.address.toLowerCase(), member);
      for (const member of pact.members) members.set(member.address.toLowerCase(), member);
      merged.set(key, { ...previous, ...pact, members: [...members.values()] });
    }
  }
  return [...merged.values()].sort((left, right) => Number(right.id) - Number(left.id));
}

export function saveLocalPact(pact: RegistryPact) {
  if (typeof window === "undefined") return;
  const next = mergeRegistryPacts(readLocalPacts(pact.protocolAddress), [pact]);
  window.localStorage.setItem(storageKey(pact.protocolAddress), JSON.stringify(next));
}

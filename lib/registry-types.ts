import type { Address, Hash } from "viem";
import type { GoalType } from "./pacts";

export type RegistryMember = {
  address: Address;
  username: string;
  joinedTx?: Hash;
};

export type RegistryPact = {
  protocolAddress: Address;
  id: string;
  creator: Address;
  title: string;
  description?: string;
  platform: GoalType;
  rule: string;
  durationDays: 7 | 14 | 30;
  recruitmentDays: number;
  recruitmentEndsAt: number;
  stake: number;
  maxMembers: number;
  memberCount?: number;
  utcOffsetMinutes?: number;
  isPrivate: boolean;
  inviteCode?: string;
  createdTx?: Hash;
  members: RegistryMember[];
};

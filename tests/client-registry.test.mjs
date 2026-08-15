import test from "node:test";
import assert from "node:assert/strict";
import { mergeRegistryPacts } from "../lib/client-registry.ts";

const protocolAddress = "0x97716448e8a4a9d282ce2c7788ce979cde4d1a20";
const creator = "0x99a5338ac4317d532ad53e3fef625cb4b6f0922b";

test("browser registry keeps recovered chain state while local metadata wins", () => {
  const recovered = {
    protocolAddress, id: "2", creator, title: "链上契约 #2", platform: "leetcode", rule: "每日 AC ≥ 1",
    durationDays: 7, recruitmentDays: 1, recruitmentEndsAt: 1, stake: 1, maxMembers: 24, memberCount: 1,
    isPrivate: false, members: [{ address: creator, username: "" }],
  };
  const local = {
    ...recovered,
    title: "每日一道题",
    members: [{ address: creator, username: "moncast-user" }],
  };

  const [merged] = mergeRegistryPacts([recovered], [local]);
  assert.equal(merged.title, "每日一道题");
  assert.equal(merged.memberCount, 1);
  assert.equal(merged.members[0].username, "moncast-user");
});

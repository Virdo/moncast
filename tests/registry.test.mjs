import assert from "node:assert/strict";
import test from "node:test";
import { pactsForProtocol } from "../lib/server/registry.ts";

const current = "0x3d36aa081b72b5037f5ae7e3adfd856d84c2cde3";
const old = "0xaf65b9d11d45547852d4355726d6b061b1c34f1c";

test("registry scopes pact ids to the configured protocol deployment", () => {
  const base = { id: "1", members: [] };
  const registry = {
    version: 1,
    pacts: [
      { ...base, protocolAddress: current },
      { ...base, protocolAddress: old },
      base,
    ],
  };

  const result = pactsForProtocol(registry, current.toUpperCase());
  assert.equal(result.length, 1);
  assert.equal(result[0].protocolAddress, current);
});

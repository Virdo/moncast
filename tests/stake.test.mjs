import assert from "node:assert/strict";
import test from "node:test";
import { stakeAmountUnits, validStakeAmount } from "../lib/stake.ts";

test("custom USDC stakes accept bounded whole amounts", () => {
  for (const amount of [1, 20, 30, 999_999, 1_000_000]) assert.equal(validStakeAmount(amount), true);
  for (const amount of [0, -1, 1.5, Number.NaN, 1_000_001, "20"]) assert.equal(validStakeAmount(amount), false);
  assert.equal(stakeAmountUnits(20), 20_000_000n);
});

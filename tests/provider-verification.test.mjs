import assert from "node:assert/strict";
import test from "node:test";
import { approvedCustomUrl, evaluateNumericRule, validProviderHandle } from "../lib/provider-verification.ts";

test("provider handles reject injection-shaped input", () => {
  assert.equal(validProviderHandle("pacta.dev_7"), true);
  assert.equal(validProviderHandle("../../etc/passwd"), false);
  assert.equal(validProviderHandle("a"), false);
});

test("custom URLs require HTTPS, public-looking hosts and an explicit origin allowlist", () => {
  const allowlist = ["https://api.example.com"];
  assert.equal(approvedCustomUrl("https://api.example.com/progress", allowlist)?.pathname, "/progress");
  assert.equal(approvedCustomUrl("http://api.example.com/progress", allowlist), null);
  assert.equal(approvedCustomUrl("https://127.0.0.1/progress", ["https://127.0.0.1"]), null);
  assert.equal(approvedCustomUrl("https://evil.example/progress", allowlist), null);
});

test("numeric rule evaluator supports bounded JSON paths and comparison operators", () => {
  assert.deepEqual(evaluateNumericRule({ distance: { km: 6.2 } }, "data.distance.km >= 5"), { valid: true, passed: true, actual: 6.2 });
  assert.deepEqual(evaluateNumericRule({ distance: { km: 3 } }, "data.distance.km >= 5"), { valid: true, passed: false, actual: 3 });
  assert.equal(evaluateNumericRule({ ok: true }, "data.ok === true").valid, false);
});

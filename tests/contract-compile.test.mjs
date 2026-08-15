import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import solc from "solc";

const root = resolve(import.meta.dirname, "..");
const contractFiles = [
  "contracts/src/ICommitmentVerifier.sol",
  "contracts/src/AttestedProofVerifier.sol",
  "contracts/src/MoncastProtocol.sol",
];

function findImport(path) {
  const candidates = [resolve(root, path), resolve(root, "node_modules", path)];
  for (const candidate of candidates) {
    try {
      return { contents: readFileSync(candidate, "utf8") };
    } catch {
      // Try the next import root.
    }
  }
  return { error: `Import not found: ${path}` };
}

const input = {
  language: "Solidity",
  sources: Object.fromEntries(
    contractFiles.map((file) => [file, { content: readFileSync(resolve(root, file), "utf8") }]),
  ),
  settings: {
    optimizer: { enabled: true, runs: 200 },
    viaIR: true,
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

test("v5 lets an early-start pact fall back to non-financial demo members", () => {
  const source = readFileSync(resolve(root, "contracts/src/MoncastProtocol.sol"), "utf8");
  assert.match(source, /PROTOCOL_VERSION\s*=\s*5/);
  assert.doesNotMatch(source, /memberCount\s*<\s*2/);
  assert.match(source, /allowDemoFallback/);
  assert.match(source, /demoMemberCount\[pactId\]/);
  assert.match(source, /MemberState\.DemoSucceeded/);
});

test("Moncast contracts compile and expose recruitment, completion and settlement", () => {
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
  const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
  assert.deepEqual(errors, [], errors.map((entry) => entry.formattedMessage).join("\n"));

  const protocol = output.contracts["contracts/src/MoncastProtocol.sol"].MoncastProtocol;
  assert.ok(protocol.evm.bytecode.object.length > 1000, "protocol bytecode should be generated");

  const functions = new Set(
    protocol.abi.filter((entry) => entry.type === "function").map((entry) => entry.name),
  );
  for (const name of [
    "PROTOCOL_VERSION",
    "createPact",
    "joinPact",
    "activateMembers",
    "startPactNow",
    "complete",
    "completeFor",
    "liquidate",
    "settleMember",
    "finalizePact",
    "claim",
  ]) {
    assert.ok(functions.has(name), `missing ${name}`);
  }

  const events = new Set(
    protocol.abi.filter((entry) => entry.type === "event").map((entry) => entry.name),
  );
  assert.ok(events.has("PactActivated"));
  assert.ok(events.has("RecruitmentClosedEarly"));
  assert.ok(events.has("DemoMemberActivated"));
  assert.ok(events.has("DemoMemberSettled"));
  assert.ok(events.has("Completed"));
  assert.ok(events.has("MemberLiquidated"));
  assert.ok(events.has("RewardClaimed"));
});

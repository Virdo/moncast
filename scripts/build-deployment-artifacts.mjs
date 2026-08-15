import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import solc from "solc";

const root = resolve(import.meta.dirname, "..");
const sources = [
  "contracts/src/ICommitmentVerifier.sol",
  "contracts/src/AttestedProofVerifier.sol",
  "contracts/src/MoncastProtocol.sol",
  "contracts/src/MockUSDC.sol",
];

function findImport(path) {
  for (const candidate of [resolve(root, path), resolve(root, "node_modules", path)]) {
    try { return { contents: readFileSync(candidate, "utf8") }; } catch { /* try next root */ }
  }
  return { error: `Import not found: ${path}` };
}

const input = {
  language: "Solidity",
  sources: Object.fromEntries(sources.map((file) => [file, { content: readFileSync(resolve(root, file), "utf8") }])),
  settings: {
    optimizer: { enabled: true, runs: 200 },
    viaIR: true,
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
if (errors.length) throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));

const selection = {
  MockUSDC: output.contracts["contracts/src/MockUSDC.sol"].MockUSDC,
  AttestedProofVerifier: output.contracts["contracts/src/AttestedProofVerifier.sol"].AttestedProofVerifier,
  MoncastProtocol: output.contracts["contracts/src/MoncastProtocol.sol"].MoncastProtocol,
};
const artifacts = Object.fromEntries(Object.entries(selection).map(([name, artifact]) => [name, {
  abi: artifact.abi,
  bytecode: `0x${artifact.evm.bytecode.object}`,
}]));
writeFileSync(resolve(root, "public", "deployment-artifacts.json"), `${JSON.stringify(artifacts)}\n`, { mode: 0o600 });
console.log("Deployment artifacts generated.");

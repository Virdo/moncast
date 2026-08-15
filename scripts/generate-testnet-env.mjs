import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const target = resolve(import.meta.dirname, "..", ".env.local");
const existing = existsSync(target) ? readFileSync(target, "utf8") : "";
if (/^ATTESTOR_PRIVATE_KEY=/m.test(existing)) {
  console.log("Existing testnet keys preserved.");
  process.exit(0);
}
const attestor = generatePrivateKey();
const relayer = generatePrivateKey();
const values = [
  "NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz",
  `NEXT_PUBLIC_INVITE_AUTHORITY_ADDRESS=${privateKeyToAccount(attestor).address}`,
  `ATTESTOR_PRIVATE_KEY=${attestor}`,
  `RELAYER_PRIVATE_KEY=${relayer}`,
  `CRON_SECRET=${randomBytes(32).toString("hex")}`,
  `AUTOMATION_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}`,
].join("\n");
writeFileSync(target, `${existing.trim()}${existing.trim() ? "\n" : ""}${values}\n`, { mode: 0o600 });
console.log(`Attestor: ${privateKeyToAccount(attestor).address}`);
console.log(`Relayer: ${privateKeyToAccount(relayer).address}`);

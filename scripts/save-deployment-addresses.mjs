import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [usdc, verifier, protocol] = process.argv.slice(2);
for (const [name, value] of Object.entries({ usdc, verifier, protocol })) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value ?? "")) throw new Error(`Invalid ${name} address`);
}
const target = resolve(import.meta.dirname, "..", ".env.local");
let content = readFileSync(target, "utf8");
const updates = {
  NEXT_PUBLIC_USDC_ADDRESS: usdc,
  NEXT_PUBLIC_VERIFIER_ADDRESS: verifier,
  NEXT_PUBLIC_MONCAST_CONTRACT_ADDRESS: protocol,
};
for (const [key, value] of Object.entries(updates)) {
  const line = `${key}=${value}`;
  content = new RegExp(`^${key}=.*$`, "m").test(content) ? content.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${content.trim()}\n${line}\n`;
}
writeFileSync(target, content, { mode: 0o600 });
console.log("Deployment addresses saved to .env.local.");

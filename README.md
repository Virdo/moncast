# Pacta · 笃行

> 知止而后有定，笃行以成链诺。

Pacta is an onchain commitment protocol for turning private goals into verifiable commitments on Monad. This repository keeps the Stitch source export under `design/stitch/`, the production UI in `app/`, and protocol contracts in `contracts/`.

The default local experience is a no-funds product demo. Live contract and wallet wiring is enabled only after verified addresses and authenticated provider projects are supplied.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm test
npm run build
```

## Architecture boundary

- Onchain: USDC escrow, proof nullifiers, check-in state, 48-hour permissionless liquidation, pact-local slash pool, lazy settlement claims.
- Offchain: profiles, platform handles, search, provider schemas, invite-code exchange, API adapters, and index/search views.
- Privacy: only commitments and proof digests reach the chain; platform payloads and account data remain client-side or inside the proving adapter.

Deployment is intentionally not embedded in the UI. Contracts must be deployed with a revocable agent-wallet session, verified on explorers, then indexed before production addresses are added.

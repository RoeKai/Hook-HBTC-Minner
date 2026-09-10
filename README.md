# HBTC Copy — R1 read-only simulation

An offline-capable TypeScript/React DApp foundation for Issue #2. R1 provides an EIP-1193 wallet **session**, mock read-only protocol data, explicit unknown values, and an interactive strategy rehearsal. It never requests a signature or constructs/sends `approve`, `transfer`, `swap`, `mine`, or `claim` transactions.

> **Safety status:** G0 is BLOCKED. The target manifest is deliberately `enabled: false` with every real chain, address, ABI, code hash, and deployment value set to `null`. Connecting a wallet does not grant automation authority.

## Run locally

Requires Node.js 20+ and npm.

```bash
npm ci
npm run dev
```

Open the printed local URL (normally <http://localhost:5173>). Simulation works without a wallet. A browser wallet is optional for exercising connect/disconnect and account/chain event handling.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

See [`docs/acceptance/R1-self-check.md`](docs/acceptance/R1-self-check.md) for requirement mapping, evidence, limitations, and rollback.

## Security boundaries

- No private-key or seed-phrase input, persistence, or logging.
- Asset values use `bigint` smallest units; `null` remains “Unknown.”
- The live-action gate fails closed for disabled, incomplete, unverified, or wrong-chain configuration.
- Mock values carry a simulation source and observation timestamp and never mix with live reads.
- Strategy state is in-memory simulation data only and is not an authorization.

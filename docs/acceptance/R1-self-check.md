# R1 self-check — read-only and simulation foundation

Date: 2026-09-10 UTC  
Dispatch: `R1-START-20260910-01`  
Base: `8eb652c5c8ac46b1e57c1cc0b95da5baa6123a70`  
Branch: `feat/r1-readonly`  
Review status: **Ready for PM/QA review (self-review only; G1 not independently accepted)**

## Scope and evidence matrix

| Requirement | Implementation | Automated/manual evidence | Result |
|---|---|---|---|
| Engineering / strict TS / CI | `package.json`, `tsconfig.app.json`, `.github/workflows/ci.yml` | lint, typecheck, Vitest, build commands below | PASS locally |
| AC01 / BR01 | `src/App.tsx`, `src/core/wallet.ts` | no secret fields; provider test proves only account/chain requests | PASS |
| AC02 / BR02 / BR22 | `src/core/manifest.ts` | disabled/empty manifest and wrong-chain gate tests | PASS; live BLOCKED |
| AC03 | `src/core/amount.ts` | reward vectors 100/50/0 and zero denominator | PASS; independent math only |
| AC17 / BR20 | amount and protocol modules | 18 decimals, huge integer, invalid values, null-vs-zero | PASS |
| Wallet lifecycle | wallet and UI modules | rejection and disconnect clearing tests; event listeners clear snapshots | PASS |
| Read adapter/dashboard | protocol interface, mock adapter, UI | all required fields carry source/time; reward categories separated | PASS simulation |
| Strategy/budgets/state | strategy module and builder | cap boundary and legal/illegal transition tests | PASS simulation |
| Staleness/window/SKIP | strategy module | stale cutoff, WAIT/EXECUTE/SKIP, offset endpoints, cross-cycle | PASS |
| Responsive UI | `src/styles.css` | 1440px and exact 360px Chrome captures generated locally | PASS locally; screenshot attachment pending |

## Actual command results

Environment: Node `v20.20.2`, npm `11.4.2`, Linux; Google Chrome `153.0.8010.36` for screenshots.

| Command | Actual result |
|---|---|
| `npm run lint` | PASS, ESLint exit 0 |
| `npm run typecheck` | PASS, TypeScript exit 0 |
| `npm test` | PASS, 2 files / 28 tests |
| `npm run build` | PASS, Vite 34 modules; JS 197.43 kB (62.48 kB gzip), CSS 4.29 kB (1.53 kB gzip) |
| headless Chrome capture | PASS locally; files removed from Git delivery because the PR creation path rejects binary files |

## Visual evidence (delivered separately)

The desktop and exact-360px captures were generated and inspected locally, then removed from the Git diff because the task result page does not support binary files. They are **not** linked from this document and are not claimed as repository-delivered evidence.

Current delivery status: **截图附件待补**. If the review platform exposes binary-attachment support, attach the two files from the out-of-repository backup and verify them against these digests:

- `r1-desktop.png`: SHA-256 `ae3cc131a8585f2c1804193bd063403e14e75939beedb7ceafe9958ffc840bc7`
- `r1-mobile-360.png`: SHA-256 `f714cf61e05b01b9939fc5826378dab8aa8d7e58e622dada6dcb6479d7a187de`

Local backup made during delivery repair: `/tmp/Hook-HBTC-Minner-R1-screenshot-backup-PM-R1-DELIVERY-002/`. This temporary environment path is evidence-preservation metadata, not a public attachment URL.

Reproduce after starting `npm run dev -- --host 0.0.0.0`:

```bash
google-chrome --headless --no-sandbox --disable-gpu --hide-scrollbars \
  --window-size=1440,1100 --screenshot=/tmp/r1-desktop.png http://127.0.0.1:5173
google-chrome --headless --no-sandbox --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=360,1100 \
  --screenshot=/tmp/r1-mobile-360.png http://127.0.0.1:5173
sha256sum /tmp/r1-desktop.png /tmp/r1-mobile-360.png
```

## Known limitations and blockers

1. G0 remains **BLOCKED**: no verified target chain, contracts, ABI, deployment block, code hash, or read-only RPC exists. No live result is claimed.
2. Data is deterministic mock data and resets on reload. Its source and observation time are shown.
3. Execution is an in-browser rehearsal; there is no persistence, scheduler, signature, authorization, transaction construction, charging, backend, or deployment.
4. Screenshot binaries are not part of this Git delivery; the review-platform attachment remains pending as documented above.
5. Hosted CI can only run after a successful branch push; local checks are not represented as hosted CI.
6. `npm audit` reported three transitive development-dependency advisories (one moderate, one high, one critical). Remediation should avoid an unsafe forced major upgrade.

## Rollback

R1 is additive and has no database, deployment, chain, or user-fund effects. Revert the R1 commit while retaining R0 commit `8eb652c5c8ac46b1e57c1cc0b95da5baa6123a70`. There are no in-flight transactions or persistent simulations to reconcile.

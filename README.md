# TruthMarket

Markets settled by evidence, not trust.

TruthMarket is an elite GenLayer Bradbury testnet app for AI-adjudicated prediction and accountability markets. Users create real-world claim markets, stake GEN on YES, NO, or INVALID, submit evidence URLs, and ask GenLayer validators to resolve outcomes with structured source-grounded reasoning.

Live app: https://truthmarket-beta.vercel.app
GitHub repo: placeholder
Current deployed contract: v3 `0xa7105D2A409b769B62a456E1d57B1210B875cEA5`
Current deploy tx: `0xd13f753ded6e988dc30e750fb5d6f08348cba3d9e8cd233e1254fb1e091f427d`
Previous v1 contract address: `0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`

## Network

- Network: GenLayer Bradbury
- Chain ID: 4221
- RPC: `https://rpc-bradbury.genlayer.com`
- Explorer: `https://explorer-bradbury.genlayer.com`
- Native token: GEN

## Contract

Source: `contracts/truth_market.py`

- Current deployed version: v0.3.0
- Current v3 address: `0xa7105D2A409b769B62a456E1d57B1210B875cEA5`
- Current v3 contract explorer: `https://explorer-bradbury.genlayer.com/address/0xa7105D2A409b769B62a456E1d57B1210B875cEA5`
- Current v3 deploy transaction: `0xd13f753ded6e988dc30e750fb5d6f08348cba3d9e8cd233e1254fb1e091f427d`
- Current v3 deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0xd13f753ded6e988dc30e750fb5d6f08348cba3d9e8cd233e1254fb1e091f427d`
- Current v3 txExecutionHash: `0x564211e5b3daed43a2c7020ee7226c9859a688552453778c5a50514d2ed21292`
- Current v3 deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`
- Previous deployed version: v0.2.0
- Previous v2 address: `0x5967EF9AfaCF174B903956Fc60C7e5674eD8e791`
- Previous v2 contract explorer: `https://explorer-bradbury.genlayer.com/address/0x5967EF9AfaCF174B903956Fc60C7e5674eD8e791`
- Previous v2 deploy transaction: `0x00d308c6d21e417c396bc7c8854a83b1fde231e5026ba49d196633aa0e607437`
- Previous v2 deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0x00d308c6d21e417c396bc7c8854a83b1fde231e5026ba49d196633aa0e607437`
- Previous v2 deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`

v3 replaces v2 because the v2 resolver timed out on Bradbury due live evidence fetching inside `resolve_market`. v3 keeps deadline enforcement and AI adjudication, but `resolve_market` uses submitted evidence metadata and notes instead of live web fetching.

v3 live read proof from Bradbury:

- `get_stats` returned:

```json
{
  "finalized_count": "0",
  "market_count": "0",
  "total_volume": "0"
}
```

- `list_markets` returned:

```json
[]
```

No markets existed yet on the current v3 contract at the time of the proof. A full v3 smoke test is not complete yet.

v3 smoke-test note:

- Use deadlines at least 60 minutes in the future. Bradbury consensus acceptance can lag wallet submission, and `create_market` checks that the deadline is still in the future when the transaction executes.
- Do not treat a returned transaction hash as accepted. Inspect it with `npm run inspect:tx -- <0x transaction hash>` and confirm the status/result before reading market state.
- Run create, stake, and evidence submission before the deadline. Run `resolve_market` only after the deadline has passed.
- Do not use 4-minute or 5-minute smoke-test deadlines; they can expire while the transaction is still pending/proposing.

v2 replaced the previous v1 deployment because v1 had create/evidence proof but lacked deadline enforcement. v2 added deadline enforcement:

- Adds strict UTC ISO deadline normalization for `YYYY-MM-DDTHH:MM:SSZ` values.
- Requires `create_market` deadlines to be in the future.
- Stops `stake` after the market deadline.
- Allows `resolve_market` only after the market deadline.

v2 live read proof from Bradbury:

- `get_stats` returned:

```json
{
  "finalized_count": "0",
  "market_count": "0",
  "total_volume": "0"
}
```

- `list_markets` returned:

```json
[]
```

No markets existed yet on the previous v2 contract at the time of the proof.

v2 smoke-test proof from Bradbury:

- `create_market` succeeded.
- `stake` succeeded.
- `submit_evidence` succeeded.
- `resolve_market` timed out twice with `LEADER_TIMEOUT` / `NOT_VOTED`.

Historical v1 deployment:

- Previous v1 address: `0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`
- Previous v1 contract explorer: `https://explorer-bradbury.genlayer.com/address/0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`
- Previous v1 deploy transaction: `0x1111931050a805ba3129c9281f78c5611b8a96ff88f4fca461005ca313135168`
- Previous v1 deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0x1111931050a805ba3129c9281f78c5611b8a96ff88f4fca461005ca313135168`
- Previous v1 deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`

Historical v1 live frontend API proof:

```bash
curl -sS -X POST https://truthmarket-beta.vercel.app/api/contract \
  -H 'content-type: application/json' \
  --data '{"method":"get_stats","args":[]}' | python3 -m json.tool
```

Returned:

```json
{
  "ok": true,
  "result": "{\"finalized_count\": \"0\", \"market_count\": \"0\", \"total_volume\": \"0\"}"
}
```

This confirms the live frontend API could read the previous v1 deployed contract, and no markets existed at the time of the proof. The Vercel production environment still needs to be updated to the v3 contract address and the frontend redeployed before the live app points to v3.

Write methods:

- `create_market(title, description, yes_rules, no_rules, invalid_rules, deadline)`
- `stake(market_id, side)` payable
- `submit_evidence(market_id, evidence_url, note)`
- `resolve_market(market_id)`
- `challenge_resolution(market_id, evidence_url, reason)`
- `finalize_market(market_id)`
- `claim_winnings(market_id)`

View methods:

- `get_market(market_id)`
- `list_markets()`
- `get_user_position(market_id, user)`
- `list_evidence(market_id)`
- `get_resolution(market_id)`
- `list_challenges(market_id)`
- `get_stats()`
- `get_leaderboard()`

## Market Lifecycle

1. A creator defines a claim and separate YES, NO, and INVALID criteria.
2. Users stake GEN on YES, NO, or INVALID before the deadline.
3. Users submit HTTPS evidence URLs and notes.
4. After the deadline, `resolve_market` uses submitted evidence metadata and notes, then asks validators for structured JSON: verdict, confidence, reasoning, accepted sources, rejected sources, and risk flags.
5. A write first returns a Bradbury consensus transaction id. It is not accepted until transaction diagnostics or accepted contract reads prove acceptance.
6. A resolution can be accepted while finalization is pending. GenExplorer may show accepted (undetermined) during this window.
7. Finalized markets allow winning-side claims. INVALID-side stakers win when INVALID is the finalized verdict.

## AI Resolution Design

The resolver must use source-grounded evidence and explicit market rules:

- YES only when YES criteria are satisfied before or at the deadline.
- NO only when NO criteria are satisfied or YES criteria clearly failed.
- INVALID when the claim is ambiguous, impossible to verify, or evidence cannot support either side.
- UNRESOLVED when more evidence is needed.

In v3, `resolve_market` does not fetch live web content. It treats submitted URLs as source identifiers and relies only on URL, note, and submitted timestamp metadata. Weak evidence should resolve to UNRESOLVED or INVALID.

TruthMarket does not claim legal truth, objective truth, guaranteed fairness, or finality before finalization.

## Frontend and API Behavior

- Frontend pages exist at `/`, `/markets`, `/markets/create`, `/markets/[id]`, `/dashboard`, `/leaderboard`, and `/docs`.
- If `NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS` is empty, the app shows honest undeployed states and no fake live markets.
- Reads go through `app/api/contract/route.ts`, which accepts POST only and allowlists view methods.
- The API validates numeric market IDs and 0x-prefixed 40-byte addresses.
- Write methods are rejected by omission from the allowlist.
- No server-side private key is used.
- Wallet writes are client-side through `genlayer-js` after a contract address is configured.

## Transaction Wording

Use Bradbury wording in UI and docs:

- Submitted
- Submitted to Bradbury consensus - acceptance pending
- Accepted - finalization pending
- Score/market state may be readable from accepted state
- GenExplorer may show accepted (undetermined) during the finalization window

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The example environment points at the current Bradbury v3 deployment.

## Deployment

- Live app: https://truthmarket-beta.vercel.app
- Latest production deployment: https://truthmarket-db4b2pzrj-mr-albert-s-projects.vercel.app

Do not paste private keys into chat or commit them to the repo. Export the deployer key only in your local shell:

```bash
export GENLAYER_DEPLOYER_PK=0x...
npm run deploy:truthmarket
```

The current Bradbury v3 deployment was accepted at `0xa7105D2A409b769B62a456E1d57B1210B875cEA5`. The previous v2 deployment at `0x5967EF9AfaCF174B903956Fc60C7e5674eD8e791` and previous v1 deployment at `0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c` are historical.

## Transaction Diagnostics

```bash
npm run inspect:tx -- <0x transaction hash>
```

The inspector prints the current status, execution result, queue position when available, and BigInt-safe JSON. If a transaction has not reached a decided state, it reports that no accepted state change exists yet instead of waiting indefinitely for `ACCEPTED`.

## Testing Commands

```bash
npm run lint
npm run build
npm audit
PYTHONPYCACHEPREFIX=/private/tmp/truthmarket-pycache python3 -m py_compile contracts/truth_market.py
git diff --check
git status --short
```

## Remaining Deployment Checklist

- Test with an injected browser wallet on GenLayer Bradbury.
- Re-run lint, build, audit, and contract syntax checks.
- Smoke-test create, stake, evidence, resolve, challenge, finalize, and claim flows on v3.

## Current Limitations

- This is a Bradbury testnet app.
- The frontend does not fabricate markets, positions, resolutions, or leaderboard rows.
- AI resolution depends on submitted evidence quality and validator execution.
- Audit fixes that require breaking wallet-stack upgrades are intentionally not forced.

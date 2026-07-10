# TruthMarket

Markets settled by evidence, not trust.

TruthMarket is an elite GenLayer Bradbury testnet app for AI-adjudicated prediction and accountability markets. Users create real-world claim markets, stake GEN on YES, NO, or INVALID, submit evidence URLs, and ask GenLayer validators to resolve outcomes with structured source-grounded reasoning.

Live app: https://truthmarket-beta.vercel.app
GitHub repo: placeholder
Current contract: v2 pending deployment
Previous v1 contract address: `0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`

## Network

- Network: GenLayer Bradbury
- Chain ID: 4221
- RPC: `https://rpc-bradbury.genlayer.com`
- Explorer: `https://explorer-bradbury.genlayer.com`
- Native token: GEN

## Contract

Source: `contracts/truth_market.py`

- Current version: v0.2.0 pending deployment
- Current address: pending deployment
- Previous v1 address: `0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`
- Previous v1 contract explorer: `https://explorer-bradbury.genlayer.com/address/0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`
- Previous v1 deploy transaction: `0x1111931050a805ba3129c9281f78c5611b8a96ff88f4fca461005ca313135168`
- Previous v1 deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0x1111931050a805ba3129c9281f78c5611b8a96ff88f4fca461005ca313135168`
- Previous v1 deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`

v2 pending deployment:

- Adds strict UTC ISO deadline normalization for `YYYY-MM-DDTHH:MM:SSZ` values.
- Requires `create_market` deadlines to be in the future.
- Stops `stake` after the market deadline.
- Allows `resolve_market` only after the market deadline.

Historical v1 live read proof from Bradbury:

```json
{
  "finalized_count": "0",
  "market_count": "0",
  "total_volume": "0"
}
```

No markets exist yet on the deployed contract.

Live frontend API proof:

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

This confirms the live frontend API could read the previous v1 deployed contract, and no markets existed at the time of the proof.

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
4. After the deadline, `resolve_market` fetches evidence and asks validators for structured JSON: verdict, confidence, reasoning, accepted sources, rejected sources, and risk flags.
5. A resolution can be accepted while finalization is pending. GenExplorer may show accepted (undetermined) during this window.
6. Finalized markets allow winning-side claims. INVALID-side stakers win when INVALID is the finalized verdict.

## AI Resolution Design

The resolver must use source-grounded evidence and explicit market rules:

- YES only when YES criteria are satisfied before or at the deadline.
- NO only when NO criteria are satisfied or YES criteria clearly failed.
- INVALID when the claim is ambiguous, impossible to verify, or evidence cannot support either side.
- UNRESOLVED when more evidence is needed.

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
- Accepted - finalization pending
- Score/market state may be readable from accepted state
- GenExplorer may show accepted (undetermined) during the finalization window

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The example environment points at the previous Bradbury v1 deployment until v2 is deployed and configured.

## Deployment

- Live app: https://truthmarket-beta.vercel.app
- Latest production deployment: https://truthmarket-db4b2pzrj-mr-albert-s-projects.vercel.app

Do not paste private keys into chat or commit them to the repo. Export the deployer key only in your local shell:

```bash
export GENLAYER_DEPLOYER_PK=0x...
npm run deploy:truthmarket
```

The previous Bradbury v1 deployment was accepted at `0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`. v2 is pending deployment and does not have an address yet.

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
- Deploy v2 with deadline enforcement and update the configured contract address.
- Re-run lint, build, audit, and contract syntax checks.
- Smoke-test create, stake, evidence, resolve, challenge, finalize, and claim flows.

## Current Limitations

- This is a Bradbury testnet app.
- v1 is deployed on Bradbury, but v2 deadline enforcement is pending deployment.
- The frontend does not fabricate markets, positions, resolutions, or leaderboard rows.
- AI resolution depends on submitted evidence quality and validator execution.
- Audit fixes that require breaking wallet-stack upgrades are intentionally not forced.

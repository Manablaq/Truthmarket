# TruthMarket

Markets settled by evidence, not trust.

TruthMarket is an elite GenLayer Bradbury testnet app for AI-adjudicated prediction and accountability markets. Users create real-world claim markets, stake GEN on YES, NO, or INVALID, submit evidence URLs, and ask GenLayer validators to resolve outcomes with structured source-grounded reasoning.

Live app: not deployed yet  
GitHub repo: placeholder  
Contract address: not deployed yet

## Network

- Network: GenLayer Bradbury
- Chain ID: 4221
- RPC: `https://rpc-bradbury.genlayer.com`
- Explorer: `https://explorer-bradbury.genlayer.com`
- Native token: GEN

## Contract

Source: `contracts/truth_market.py`

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

Leave `NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS` empty until the contract is deployed.

## Testing Commands

```bash
npm run lint
npm run build
npm audit
python3 -m py_compile contracts/truth_market.py
git diff --check
git status --short
```

## Deployment Checklist

- Deploy `contracts/truth_market.py` to GenLayer Bradbury.
- Verify the deployed contract address on GenExplorer.
- Set `NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS`.
- Test with an injected browser wallet on GenLayer Bradbury.
- Re-run lint, build, audit, and contract syntax checks.
- Smoke-test create, stake, evidence, resolve, challenge, finalize, and claim flows.

## Current Limitations

- This is a Bradbury testnet app.
- The contract is not deployed yet.
- The frontend does not fabricate markets, positions, resolutions, or leaderboard rows.
- AI resolution depends on submitted evidence quality and validator execution.
- Audit fixes that require breaking wallet-stack upgrades are intentionally not forced.

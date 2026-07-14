# TruthMarket Bradbury Deployment

Deployment date: 2026-07-10

## Frontend

- Live app: https://truthmarket-beta.vercel.app
- Historical immutable Vercel deployment URL: https://truthmarket-jm73uuq2e-mr-albert-s-projects.vercel.app (this URL may require Vercel authentication and is not cited as publicly verifiable)
- Latest premium UI commit: `6248d48` (`style: add premium TruthMarket interface`)
- Premium UI deployment recorded for the public production alias `https://truthmarket-beta.vercel.app`.
- Historical frontend availability check on 2026-07-10: `curl -I https://truthmarket-beta.vercel.app` returned `HTTP/2 200`. The content observed then is not evidence of the current frontend or protocol finality.

## Contract

- Current deployed version: v0.3.0
- Current v3 contract address: `0xa7105D2A409b769B62a456E1d57B1210B875cEA5`
- Current v3 deploy transaction: `0xd13f753ded6e988dc30e750fb5d6f08348cba3d9e8cd233e1254fb1e091f427d`
- Current v3 txExecutionHash: `0x564211e5b3daed43a2c7020ee7226c9859a688552453778c5a50514d2ed21292`
- Current v3 deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`
- Current v3 contract explorer: `https://explorer-bradbury.genlayer.com/address/0xa7105D2A409b769B62a456E1d57B1210B875cEA5`
- Current v3 deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0xd13f753ded6e988dc30e750fb5d6f08348cba3d9e8cd233e1254fb1e091f427d`
- Previous deployed version: v0.2.0
- Previous v2 contract address: `0x5967EF9AfaCF174B903956Fc60C7e5674eD8e791`
- Previous v2 deploy transaction: `0x00d308c6d21e417c396bc7c8854a83b1fde231e5026ba49d196633aa0e607437`
- Previous v2 deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`
- Previous v2 contract explorer: `https://explorer-bradbury.genlayer.com/address/0x5967EF9AfaCF174B903956Fc60C7e5674eD8e791`
- Previous v2 deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0x00d308c6d21e417c396bc7c8854a83b1fde231e5026ba49d196633aa0e607437`
- Previous v1 contract address: `0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`
- Previous v1 deploy transaction: `0x1111931050a805ba3129c9281f78c5611b8a96ff88f4fca461005ca313135168`
- Previous v1 deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`
- Previous v1 contract explorer: `https://explorer-bradbury.genlayer.com/address/0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`
- Previous v1 deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0x1111931050a805ba3129c9281f78c5611b8a96ff88f4fca461005ca313135168`

v3 replaces v2 because the v2 resolver timed out on Bradbury due live evidence fetching inside `resolve_market`. v3 keeps strict UTC ISO deadline enforcement and AI adjudication, but `resolve_market` uses submitted evidence metadata and notes instead of live web fetching.

v2 replaced v1 because v1 had create/evidence proof but lacked deadline enforcement. v2 added strict UTC ISO deadline enforcement:

- `create_market` requires a future second-precision UTC ISO `YYYY-MM-DDTHH:MM:SSZ` deadline.
- `stake` is blocked after the deadline.
- `resolve_market` is blocked until after the deadline.

## Network

- Network: GenLayer Bradbury
- Chain ID: `4221`
- RPC: `https://rpc-bradbury.genlayer.com`
- Explorer: `https://explorer-bradbury.genlayer.com`
- Native token: GEN

## Current v3 Deployment Proof

- Contract explorer: `https://explorer-bradbury.genlayer.com/address/0xa7105D2A409b769B62a456E1d57B1210B875cEA5`
- Deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0xd13f753ded6e988dc30e750fb5d6f08348cba3d9e8cd233e1254fb1e091f427d`
- txExecutionHash: `0x564211e5b3daed43a2c7020ee7226c9859a688552453778c5a50514d2ed21292`
- Deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`

## Current v3 Live Read Proof

Observed `get_stats` output:

```json
{
  "finalized_count": "0",
  "market_count": "0",
  "total_volume": "0"
}
```

Observed `list_markets` output:

```json
[]
```

No markets existed yet on the current v3 contract at the time of the initial read proof.

## Historical V3 accepted-state smoke record — observed 2026-07-11

> This record demonstrates accepted-state create, stake, and evidence observations only. `ACCEPTED` is nonterminal and is not protocol finality proof. No preserved V3 proof exists here for resolution, challenge, finalization, or claims.

Market #3 was observed through accepted-state contract reads on the V3 contract:

- The created market was visible in accepted state.
- A 0.001 GEN stake was visible as escrowed in the market pool; this observation does not prove the transaction reached `FINALIZED`.
- Submitted evidence was visible in accepted state.
- The market remained `OPEN` and unresolved.
- The complete lifecycle remained unverified.

Transaction success must be established separately from a receipt showing both `FINALIZED` and `FINISHED_WITH_RETURN`. `ACCEPTED` and `FINALIZED` are never interchangeable.

## v3 Smoke-Test Guidance

- Run `npm run smoke:truthmarket` with `NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS` and `GENLAYER_DEPLOYER_PK` exported locally.
- The smoke script uses GenLayer Bradbury, validates but never prints the private key, creates a market with a deadline more than 2 hours in the future, waits for `create_market` to reach `ACCEPTED`, then polls accepted `list_markets` until a new market appears with the expected title, deadline, and `created_at` window before staking.
- Contract deadlines must be second-precision UTC ISO values: `YYYY-MM-DDTHH:MM:SSZ`. The smoke script strips milliseconds and validates the format before submitting `create_market`.
- The script stakes YES only on that confirmed new market, submits one evidence note, prints the market id and create/stake/evidence transaction hashes, then stops. It does not resolve automatically.
- GenLayer `@gl.public.view` reads are read-only and return immediately. `gen_call` returns structured JSON and defaults to accepted state when status is omitted, but contract view functions can return strings. In this app, `list_markets` returns a JSON string.
- The smoke script parses a successful `list_markets` contract return as JSON before classifying failures. Valid JSON strings are accepted as contract data, and the script does not scan successful contract strings for broad transient terms such as `502`, `503`, or `504`.
- Bradbury may return transient HTML or other non-JSON gateway responses for `gen_call` / read operations such as `list_markets`. The smoke script retries thrown RPC/transport read failures, and retries an obvious gateway body only when parsing the returned `list_markets` string fails first.
- The smoke script may warn if `https://rpc-bradbury.genlayer.com/health` fails or does not return JSON status `up`. That health endpoint is advisory ops information; health failure alone does not prove the contract read or write path has failed.
- Bradbury can reject `eth_sendRawTransaction` before any EVM wrapper tx hash or GenLayer consensus tx id exists with `Node is not currently accepting transactions: pipeline backpressure (l1_sender_commit)`. That is RPC/node backpressure, not proof of a contract error. The smoke script retries only that pre-hash case with 15s, 30s, 60s, and 120s backoff.
- If an error includes an EVM wrapper tx hash, inspect it with `npm run inspect:evm-wrapper -- <hash>` instead of retrying blindly.
- If a GenLayer consensus tx hash exists but does not accept, inspect it with `npm run inspect:tx -- <hash>` instead of retrying blindly.
- `writeContract` returns a transaction hash; state is not instant. Use accepted-state contract reads as supplementary observations only. Establish transaction success separately from a receipt showing `FINALIZED` and `FINISHED_WITH_RETURN`.
- Payable writes, including stake, pass `value` in wei.
- Run create, stake, and evidence submission before the deadline. Run `resolve_market` only after the deadline has passed.
- Do not use 4-minute or 5-minute smoke-test deadlines; they can expire while the transaction is still pending/proposing.
- Market 1 and Market 2 were diagnostic attempts, not final successful v3 smoke tests. Market 2 exists and is OPEN, but its stake retry failed before any tx hash because Bradbury RPC rejected `eth_sendRawTransaction` with pipeline backpressure.

Smoke command:

```bash
export NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS=0xa7105D2A409b769B62a456E1d57B1210B875cEA5
printf "Paste deployer private key, then press Enter: "
stty -echo
IFS= read -r GENLAYER_DEPLOYER_PK
stty echo
printf "\n"
export GENLAYER_DEPLOYER_PK
npm run smoke:truthmarket
unset GENLAYER_DEPLOYER_PK
```

## Previous v2 Deployment Proof

- Contract explorer: `https://explorer-bradbury.genlayer.com/address/0x5967EF9AfaCF174B903956Fc60C7e5674eD8e791`
- Deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0x00d308c6d21e417c396bc7c8854a83b1fde231e5026ba49d196633aa0e607437`
- Deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`

## Previous v2 Live Read Proof

Observed `get_stats` output:

```json
{
  "finalized_count": "0",
  "market_count": "0",
  "total_volume": "0"
}
```

Observed `list_markets` output:

```json
[]
```

No markets existed yet on the previous v2 contract at the time of the proof.

## Previous v2 Smoke-Test Proof

- `create_market` succeeded.
- `stake` succeeded.
- `submit_evidence` succeeded.
- `resolve_market` timed out twice with `LEADER_TIMEOUT` / `NOT_VOTED`.

The v2 smoke test proves create, stake, and evidence submission worked, but does not prove successful resolution. v3 is intended to replace v2 by removing live web fetching from `resolve_market`.

## Historical v1 Live Read Proof

Command:

```bash
curl -s https://rpc-bradbury.genlayer.com \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"sim_call","params":[{"address":"0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c","method":"get_stats","args":[]}]}'
```

Observed `get_stats` output:

```json
{
  "finalized_count": "0",
  "market_count": "0",
  "total_volume": "0"
}
```

No markets existed yet on the previous v1 contract at the time of the proof.

## Historical v1 Live Frontend API Proof

Command:

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

No markets existed yet on the previous v1 contract at the time of the proof.

## Transaction Diagnostics

```bash
npm run inspect:tx -- <0x transaction hash>
```

The inspector prints the current status, execution result, queue position when available, and BigInt-safe JSON. If a transaction has not reached a decided state, it reports that no accepted state change exists yet instead of waiting indefinitely for `ACCEPTED`.

## Next Steps

- Run `npm run smoke:truthmarket` on Bradbury and keep the printed market id, create tx, stake tx, evidence tx, and deadline with the deployment record.

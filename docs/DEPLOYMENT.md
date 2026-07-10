# TruthMarket Bradbury Deployment

Deployment date: 2026-07-10

## Frontend

- Live app: https://truthmarket-beta.vercel.app
- Latest production deployment: https://truthmarket-db4b2pzrj-mr-albert-s-projects.vercel.app

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

No markets existed yet on the current v3 contract at the time of the proof. A full v3 smoke test is not complete yet.

## v3 Smoke-Test Guidance

- Run `npm run smoke:truthmarket` with `NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS` and `GENLAYER_DEPLOYER_PK` exported locally.
- The smoke script uses GenLayer Bradbury, validates but never prints the private key, creates a market with a deadline more than 2 hours in the future, waits for `create_market` to reach `ACCEPTED`, then polls accepted `list_markets` until a new market appears with the expected title, deadline, and `created_at` window before staking.
- Contract deadlines must be second-precision UTC ISO values: `YYYY-MM-DDTHH:MM:SSZ`. The smoke script strips milliseconds and validates the format before submitting `create_market`.
- The script stakes YES only on that confirmed new market, submits one evidence note, prints the market id and create/stake/evidence transaction hashes, then stops. It does not resolve automatically.
- Bradbury can reject `eth_sendRawTransaction` before any EVM wrapper tx hash or GenLayer consensus tx id exists with `Node is not currently accepting transactions: pipeline backpressure (l1_sender_commit)`. That is RPC/node backpressure, not proof of a contract error. The smoke script retries only that pre-hash case with 15s, 30s, 60s, and 120s backoff.
- If an error includes an EVM wrapper tx hash, inspect it with `npm run inspect:evm-wrapper -- <hash>` instead of retrying blindly.
- If a GenLayer consensus tx hash exists but does not accept, inspect it with `npm run inspect:tx -- <hash>` instead of retrying blindly.
- Do not treat a returned transaction hash as accepted. Inspect it with `npm run inspect:tx -- <0x transaction hash>` and confirm the status/result before reading market state.
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

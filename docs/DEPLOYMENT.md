# TruthMarket Bradbury Deployment

Deployment date: 2026-07-10

## Frontend

- Live app: https://truthmarket-beta.vercel.app
- Latest production deployment: https://truthmarket-db4b2pzrj-mr-albert-s-projects.vercel.app

## Contract

- Current version: v0.2.0
- Current v2 contract address: `0x5967EF9AfaCF174B903956Fc60C7e5674eD8e791`
- Current v2 deploy transaction: `0x00d308c6d21e417c396bc7c8854a83b1fde231e5026ba49d196633aa0e607437`
- Current v2 deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`
- Current v2 contract explorer: `https://explorer-bradbury.genlayer.com/address/0x5967EF9AfaCF174B903956Fc60C7e5674eD8e791`
- Current v2 deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0x00d308c6d21e417c396bc7c8854a83b1fde231e5026ba49d196633aa0e607437`
- Previous v1 contract address: `0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`
- Previous v1 deploy transaction: `0x1111931050a805ba3129c9281f78c5611b8a96ff88f4fca461005ca313135168`
- Previous v1 deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`
- Previous v1 contract explorer: `https://explorer-bradbury.genlayer.com/address/0x82da95Ce69eb05d3CE3443F3D134D47dACFa036c`
- Previous v1 deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0x1111931050a805ba3129c9281f78c5611b8a96ff88f4fca461005ca313135168`

v2 replaces v1 because v1 had create/evidence proof but lacked deadline enforcement. v2 adds strict UTC ISO deadline enforcement:

- `create_market` requires a future `YYYY-MM-DDTHH:MM:SSZ` deadline.
- `stake` is blocked after the deadline.
- `resolve_market` is blocked until after the deadline.

## Network

- Network: GenLayer Bradbury
- Chain ID: `4221`
- RPC: `https://rpc-bradbury.genlayer.com`
- Explorer: `https://explorer-bradbury.genlayer.com`
- Native token: GEN

## Current v2 Deployment Proof

- Contract explorer: `https://explorer-bradbury.genlayer.com/address/0x5967EF9AfaCF174B903956Fc60C7e5674eD8e791`
- Deploy transaction explorer: `https://explorer-bradbury.genlayer.com/tx/0x00d308c6d21e417c396bc7c8854a83b1fde231e5026ba49d196633aa0e607437`
- Deployer: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`

## Current v2 Live Read Proof

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

No markets existed yet on the current v2 contract at the time of the proof.

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

## Next Steps

- Update the Vercel environment to the v2 contract address.
- Redeploy the frontend so the live app points to v2.
- Run a real v2 market smoke test on Bradbury.

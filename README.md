# TruthMarket V3

TruthMarket is a GenLayer Bradbury testnet interface for claim markets. V3 applies GenLayer AI consensus to user-submitted URL identifiers, explanatory notes, and timestamps. The contract does not fetch or authenticate webpage contents.

Live interface: https://truthmarket-beta.vercel.app

## Deployed identity

- Network: GenLayer Bradbury testnet
- Chain ID: `4221` (`0x107d`)
- Native currency: GEN (18 decimals)
- Contract V3: `0xa7105D2A409b769B62a456E1d57B1210B875cEA5`
- RPC: `https://rpc-bradbury.genlayer.com`
- Explorer: `https://explorer-bradbury.genlayer.com`

Reads explicitly request accepted state. Accepted state is useful supplementary evidence, but is not protocol finality proof. Transaction success requires `FINALIZED` plus `FINISHED_WITH_RETURN`.

## Safety boundary

V3 validators receive URL strings, user notes, and submission timestamps only. Source identity, accessibility, content, quality, and publication dates are not authenticated. Challenge evidence is stored but not included in re-resolution. V3 has no refund/cancellation path or challenge waiting period. No-evidence, UNRESOLVED, and zero-winning-pool cases can lock funds. The complete lifecycle is not end-to-end verified.

Wallet writes use explicit EIP-6963 selection, the exact selected provider, Bradbury switch/add handling, immediate chain/account re-verification, a duplicate lock, staged safe errors, and strict transaction-hash validation. Activity is browser-local and is never proof of protocol finality.

## Development

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Validation is documented in `docs/TESTING.md`. Never place private keys, seed phrases, or tokens in this repository. No deployment is part of Phase A.

## License

No software license is granted or implied. The repository's LICENSE decision remains open.

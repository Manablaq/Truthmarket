# Architecture

Browser reads call the POST-only `/api/contract` route, which validates exact arguments, performs one time-bounded accepted-state read, parses JSON strings or objects, and applies exact V3 runtime schemas. The installed SDK does not expose an abort-capable transport for this call, so the route does not claim to cancel upstream work and does not start an overlapping retry after a local timeout. Browser writes never pass through that API: the selected EIP-1193 provider and connected account are supplied directly to `genlayer-js` configured with `testnetBradbury`.

The active contract is V3 `0xa7105D2A409b769B62a456E1d57B1210B875cEA5`. No frontend code changes its ABI, storage, lifecycle, payout rules, or payable semantics. Accepted-state reads are not finality proof.

V4 requires contract changes for authenticated/fetched content, challenge evidence in re-resolution, a challenge waiting period, refunds/cancellation, and recovery from no-evidence, UNRESOLVED, and zero-winning-pool states.

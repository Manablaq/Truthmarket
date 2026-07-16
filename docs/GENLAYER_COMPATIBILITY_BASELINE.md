# GenLayer Compatibility Baseline

This file is the version-specific API authority for TruthMarket work before Gate 2 or production V4 coding. Installed declarations and pinned runtime evidence override examples from another SDK generation.

## Pinned versions and network

- `genlayer-js` is repository-locked to `1.1.8`; `package.json` currently requests `^1.1.8`, while `package-lock.json` selects the exact installed version.
- The GenLayer CLI was locally observed as `0.39.1`. It is not pinned by this repository and MUST be re-recorded for every reproducibility run.
- Python contracts pin `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` in their `Depends` header.
- The selected network is GenLayer Bradbury, chain ID `4221`, RPC `https://rpc-bradbury.genlayer.com`.

## Supported Python generation

The pinned contract family is the top-level `gl` generation used by V3 and the approved Gate 1 probe: `gl.Contract`, `@gl.public.view`, `@gl.public.write`, `@gl.public.write.payable`, `gl.message`, `gl.message_raw`, `@allow_storage`, `gl.nondet.exec_prompt`, and `gl.eq_principle.prompt_non_comparative`. The matching intelligent-contract lookup family is top-level `gl.get_contract_at` with a top-level `@gl.contract_interface`; it is not exercised by current TruthMarket production code and MUST pass an isolated compile before first use. The currently exercised outbound EVM/EOA family is `@gl.evm.contract_interface` followed by interface-instance `emit_transfer(value=u256(...))`.

Do not mix in newer namespace examples such as `gl.contract.Contract`, `gl.contract.get_at`, `gl.contract.deploy`, `gl.contract.interface`, `gl.message.raw`, or the newer storage `allow` spelling. A Python SDK change requires the change-control process below.

## Installed JavaScript rules

The installed `genlayer-js@1.1.8` declarations and matching package source are authoritative.

- The installed `writeContract` type requires `value`; every call MUST supply it explicitly.
- `stateStatus` is unsupported. Contract reads use `transactionHashVariant` with the installed `TransactionHashVariant.LATEST_FINAL` or `LATEST_NONFINAL` enum member selected for the read's purpose.
- Production and tooling code MUST NOT rely on undeclared `fullTransaction`, even though the current package runtime contains an internal waiter option with that name.
- `waitForTransactionReceipt()` is only a polling/finality barrier. In the installed runtime its simplified result currently exposes snake-case fields such as `status_name`; production verification MUST NOT depend on those undocumented/simplified names. After the waiter returns, code MUST call `getTransaction({hash})` and inspect that authoritative object's typed `statusName` and `txExecutionResultName` fields.
- Deployment proof MUST compile the exact local source with `getContractSchemaForCode`, validate both local and deployed `ContractSchema` structures, retrieve exact deployed source and schema, and require deterministic full structural schema equality rather than comparing only method names or counts.
- Consensus `resultName`, including `AGREE`, does not replace inspection of `txExecutionResultName`.

The transaction-success rule is exact:

```text
Successful finalized write =
getTransaction().statusName is FINALIZED
AND
getTransaction().txExecutionResultName is FINISHED_WITH_RETURN
```

`AGREE` alone is insufficient. `FINALIZED + FINISHED_WITH_ERROR` is terminal execution failure. `ACCEPTED + FINISHED_WITH_RETURN` is valid provisional accepted execution: it is nonterminal, MUST continue polling, and MUST NOT trigger finalized-success-only post-checks. `ACCEPTED + FINISHED_WITH_ERROR` is provisional error evidence, never success, and remains monitored until the repository's terminal-state model observes a terminal outcome.

## Outbound transfer boundary

EOA/EVM payouts use deferred external-message behavior through the intelligent contract's ghost/EVM layer. A claim MUST NOT be implemented on the assumption that outbound transfer is a synchronous call. Internal intelligent-contract value messages are not a substitute because child failure is not automatically refundable.

Gate 5 remains unresolved and is the authority for the payout state machine. No production V4 claim code may be written until a Bradbury probe proves and selects semantics that guarantee one economic payment, no double claim, no lost liability, no claim-order dependence, observable failure, deterministic retry or reconciliation, reentrancy safety, and exact conservation. If reproducible Bradbury evidence proves atomic parent rollback on external-message failure, the single-write claim model may be retained. Otherwise the architecture, ABI, claim statuses, activity timing/mapping, and tests MUST receive an independently reviewed asynchronous or two-phase redesign before production V4 coding.

Current public claim names and beneficiaries express economic intent only. They do not authorize implementation of unproven transfer semantics.

## Change control

Any SDK or runtime upgrade requires all of the following before use: an explicit dependency update, installed declaration audit, installed source audit, isolated compilation, reproducible Bradbury evidence, and independent review. No compatibility conclusion carries across versions implicitly.

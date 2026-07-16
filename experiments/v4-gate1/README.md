# TruthMarket V4 Feasibility Gate 1

This directory is an isolated feasibility prototype for deterministic request bookkeeping followed by separate intelligent execution. It is not TruthMarket V4 production-contract implementation and is not imported by the V3 contract or frontend.

## Selected experiment network

The live runner is hard-locked to the nonproduction **Genlayer Bradbury Testnet**, chain ID `4221`, RPC `https://rpc-bradbury.genlayer.com`. It always deploys a new experimental `TruthMarketV4Gate1Probe` address and never reads or writes the V3 address.

The repository's GenLayer CLI was also observed configured for Bradbury chain `4221`. A live run must record the SDK chain object, deployment hash, new address, finalized deployment receipt, source SHA-256, and both public signer addresses.

## Prototype lifecycle

1. `request_probe(payload)` is a normal `@gl.public.write`. It allocates a one-based ID and stores the exact payload, requester, request timestamp, `REQUESTED`, and empty completion fields. It contains no nondeterministic call.
2. `execute_probe(request_id)` is a later `@gl.public.write`. It accepts only an ID, loads the exact stored payload, runs a tightly constrained LLM classification through `gl.nondet.exec_prompt` and `prompt_non_comparative`, then stores `COMPLETED`, result, executor, and completion timestamp.
3. The status guard prevents a second successful execution. Zero and nonexistent request IDs reject before AI invocation.

The probe deliberately omits markets, staking, bonds, challenges, retries, settlement, claims, participant indexing, leaderboard, migration, and V4 accounting.

## What existing V3 evidence proves

- V3 source contains a working-form GenLayer AI invocation pattern inside `resolve_market`.
- Existing scripts can submit writes, receive a transaction hash, inspect normalized transaction status, wait for accepted receipts, and read accepted state.
- Existing finality logic distinguishes `ACCEPTED`, `READY_TO_FINALIZE`, and `FINALIZED`, and treats success as `FINALIZED` plus `FINISHED_WITH_RETURN`.

It does not prove Gate 1. V3 performs request construction, AI execution, and result storage inside one `resolve_market` transaction. Preserved V3 deployment evidence contains no finalized successful resolution lifecycle.

## Local validation

```bash
python3 -m unittest discover -s experiments/v4-gate1/tests -p 'test_*.py' -v
PYTHONPYCACHEPREFIX=/tmp/truthmarket-v4-gate1-pycache \
  python3 -m py_compile experiments/v4-gate1/contracts/truth_market_v4_gate1_probe.py
node --check experiments/v4-gate1/scripts/run-gate1.mjs
```

The local model proves intended transitions and atomic rollback behavior only. It cannot prove GenLayer execution, permissionlessness, or accepted/finalized observability.

## Captured live run

The run recorded in `fixtures/gate1-evidence.json` used a newly deployed probe at `0xeE59406E93c60BcA0375EdD4084209aA28e6Ab95`, requester `0x1f87Ae197af539253978d435aD45cCf28Fb95024`, and distinct executor `0x22c3D77ee135905C0ED00cC8249Ef5958399b3e1`. The public deployed-code SHA-256 exactly matches the local source SHA-256.

Bradbury exposes an appeal window between `ACCEPTED` and `READY_TO_FINALIZE`. The runner polls the transaction status, submits the standard public finalization call only after readiness, and then requires `FINALIZED` plus `FINISHED_WITH_RETURN` for successful writes. Failed duplicate and invalid-ID transactions must finalize with an execution error and unchanged state.

For `genlayer-js` 1.1.8, the supported read selector is `transactionHashVariant` (`latest-nonfinal` or `latest-final`), not `stateStatus`. In the captured run the two read variants returned the same storage during the appeal window, so finality is determined from transaction status and execution result rather than inferred from a state read.

## Live reproduction

Use two distinct funded Bradbury test accounts. Never place their keys in this repository or shell history.

```bash
export GATE1_NETWORK=bradbury
export GENLAYER_GATE1_REQUESTER_PK='<redacted>'
export GENLAYER_GATE1_EXECUTOR_PK='<redacted>'
node experiments/v4-gate1/scripts/run-gate1.mjs
unset GENLAYER_GATE1_REQUESTER_PK GENLAYER_GATE1_EXECUTOR_PK
```

The runner refuses identical requester/executor addresses. It writes only public machine-readable evidence to `fixtures/gate1-evidence.json`. It does not retry a submission after a hash exists. A run is not a pass unless both lifecycle writes are finalized successes, both accepted states were directly observed, the executor differs from the requester, duplicate and invalid executions finalize unsuccessfully without state changes, and exact stored payload equality is demonstrated.

## Official platform references

- GenLayerJS transaction, read, write, and execution-result documentation: <https://docs.genlayer.com/api-references/genlayer-js>
- GenLayer transaction statuses: <https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/transactions/transaction-statuses>
- GenLayer nondeterminism and consensus rules: <https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism>
- Non-comparative LLM contract example: <https://docs.genlayer.com/developers/intelligent-contracts/examples/llm-hello-world-non-comparative>

## Safety

- No production address or deployment script is referenced.
- No key, token, or signed payload is logged or written.
- Bradbury is nonproduction, but transactions and addresses remain public.
- Gate 1 results do not authorize Gate 2–10 claims or any V4 production-contract branch.

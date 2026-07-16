# TruthMarket V4 Gate 1 results

## 1. Exact verdict

`GATE 1 PASSED`

All pass conditions were demonstrated with direct nonproduction network evidence. The deployment, request, and permissionless execution finalized with `FINISHED_WITH_RETURN`; the duplicate and invalid-ID attempts finalized with `FINISHED_WITH_ERROR`; and the final record and request count remained correct.

## 2. Executive summary

The isolated probe demonstrated the required two-transaction lifecycle at accepted state on Bradbury Testnet. A normal request transaction stored one-based request `1`, the exact payload, requester, timestamp, `REQUESTED`, and empty execution fields without invoking AI. A later transaction from a genuinely different address accepted only request ID `1`, loaded the stored payload, ran the non-comparative GenLayer mechanism, and stored `COMPLETED`, result, executor, and a later timestamp.

Duplicate and nonexistent executions were separate transactions that finalized with `FINISHED_WITH_ERROR`. Their public traces show the exact assertion failures, zero LLM calls, zero storage proof, and unchanged state. Submission hashes, accepted receipts, execution results, finalization readiness, and finalized receipts are independently queryable. Bradbury's status endpoint showed an appeal window and the separate `READY_TO_FINALIZE` state before transactions automatically transitioned to `FINALIZED`.

This is feasibility evidence only. It is not V4 production-contract implementation and does not authorize production work.

## 3. Tested network and chain ID

- Network: Genlayer Bradbury Testnet (nonproduction)
- Chain ID: `4221`
- RPC: `https://rpc-bradbury.genlayer.com`
- Consensus contract: `0x0112Bf6e83497965A5fdD6Dad1E447a6E004271D`
- GenLayer CLI: `0.39.1`
- Installed `genlayer-js`: `1.1.8`
- Deployment created: `2026-07-16T00:05:40Z`

## 4. Experimental contract address

`0xeE59406E93c60BcA0375EdD4084209aA28e6Ab95`

The class is `TruthMarketV4Gate1Probe`. Public deployed bytes and local source both have SHA-256 `258c9023adfca7fdee94028baa228fb112bc854ca1db05a2869b70f204eb9e1a`.

Deployment finalized as `FINALIZED`, `AGREE`, `FINISHED_WITH_RETURN`, observed at `2026-07-16T00:36:08.169Z`.

## 5. Source commit

The experiment branched from approved `main` commit `625bbe5fb53d8cdafe55c8879bae987698711215` on `spike/v4-gate1-two-step-execution`.

## 6. Requirement matrix

See `GATE1_REQUIREMENTS.md` for G1-01 through G1-18. All Gate 1 requirements are satisfied by the accepted and finalized transaction evidence, identity and timestamp fields, exact payload preservation, bounded reads, error traces, and unchanged final state.

## 7. Prototype architecture

`TruthMarketV4Gate1Probe` contains only a string request counter and a `TreeMap[str, str]` of canonical, sorted JSON records.

- `request_probe(payload)` validates a bounded nonempty payload, allocates `request_count + 1`, stores exact request fields, and returns the ID. It contains no nondeterministic or AI call.
- `execute_probe(request_id)` accepts no replacement payload. It requires a stored `REQUESTED` record, loads its exact payload, runs `gl.nondet.exec_prompt` through `gl.eq_principle.prompt_non_comparative`, validates the bounded result, then stores completion fields.
- `get_probe` and `get_request_count` expose bounded observability.
- There is no market, stake, bond, challenge, retry, settlement, claim, participant, leaderboard, migration, accounting, frontend, or production integration.

## 8. Request transaction evidence

- Hash: `0x2c1597b55bf683bbdea008c7beb20752d1b71004ffa5b539b306a42bee646aa0`
- Caller/requester: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`
- Created/request timestamp: `1784160701` / `2026-07-16T00:11:41Z`
- Accepted result: `ACCEPTED`, `AGREE`, `FINISHED_WITH_RETURN`
- Votes: five `AGREE`
- Accepted state: ID `1`, payload `gate-one-alpha`, status `REQUESTED`, empty `result`, `executor`, and `completed_at`
- Finalized result: `FINALIZED`, `AGREE`, `FINISHED_WITH_RETURN`, observed `2026-07-16T00:42:19.099Z`

The accepted state was read before execution was submitted, proving that the request was independently observable without an AI result.

## 9. Execution transaction evidence

- Hash: `0x9045f352ed6520e37ef23587c5ed69c63896b9cf91a19469d5de589e1c674e82`
- Caller/executor: `0x22c3D77ee135905C0ED00cC8249Ef5958399b3e1`
- Created/completion timestamp: `1784160790` / `2026-07-16T00:13:10Z`
- Accepted result: `ACCEPTED`, `AGREE`, `FINISHED_WITH_RETURN`
- Eq-block output and stored result: `OTHER`
- Accepted state: status `COMPLETED`, exact original payload and requester preserved, executor and completion time stored
- Finalized result: `FINALIZED`, `AGREE`, `FINISHED_WITH_RETURN`, observed `2026-07-16T00:44:04.469Z`

The accepted receipt had validator vote names `AGREE`, `AGREE`, `AGREE`, `TIMEOUT`, and `DETERMINISTIC_VIOLATION`; consensus still accepted `FINISHED_WITH_RETURN`. The constrained classifier's `OTHER` answer is semantically unexpected for `gate-one-alpha`, but it is one of the two allowed probe outputs. Gate 1 evaluates lifecycle separation and stored-input consumption, not oracle quality.

## 10. Permissionless-executor evidence

Permissionless execution is directly demonstrated by distinct public addresses:

- Stored requester: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`
- Execution sender and stored executor: `0x22c3D77ee135905C0ED00cC8249Ef5958399b3e1`

The executor was a separately created, funded Bradbury test account. No requester-only source guard exists. The evidence is not simulated.

## 11. Duplicate-execution evidence

- Hash: `0x1da36ecfb9dcea961e6279e9c0be10deca67ee44e95ca3d53e7211385a134edf`
- Accepted result: `ACCEPTED`, `AGREE`, `FINISHED_WITH_ERROR`
- Votes: five `DISAGREE`
- Trace error: `AssertionError: request is not executable`
- Trace LLM calls: `0`
- Trace storage proof: all-zero
- State after: identical completed record; no second result, executor, or completion timestamp
- Finalized result: `FINALIZED`, `AGREE`, `FINISHED_WITH_ERROR`, observed `2026-07-16T00:46:17.181Z`

An earlier wrapper attempt, `0x7915c3cc700bf901127ac4a1351af91fbc8e704ba2f45ca18a03a14c6abf8d4f`, reverted before creating a GenLayer transaction because prior accepted transactions had reserved the executor's available consensus funds. It is recorded as a tooling/funding rejection, not as duplicate-contract evidence.

## 12. Invalid-request evidence

- Invalid ID: `999999`
- Hash: `0xdc4e83844aa65f8c8263330bf71377d4385239cc0df2f214d01cdfd145086127`
- Accepted result: `ACCEPTED`, `AGREE`, `FINISHED_WITH_ERROR`
- Votes: five `DISAGREE`
- Trace error: `AssertionError: request not found`
- Trace LLM calls: `0`
- Trace storage proof: all-zero
- Request count after: `1`
- Valid record after: unchanged
- Finalized result: `FINALIZED`, `AGREE`, `FINISHED_WITH_ERROR`, observed `2026-07-16T00:48:23.540Z`

An earlier wrapper attempt, `0x4a2cd1677e3089ffbed3ae786a796de14fc7c761dbb1411fe237cba8177c05d0`, was likewise rejected before GenLayer submission due to reserved funds and is not used as the contract result.

## 13. Accepted-versus-finalized evidence

The documented `gen_getTransactionStatus` method returned status code `5` (`Accepted`) for the successful deployment while future-timestamp probes returned code `11` (`ReadyToFinalize`) only after the appeal window. Binary search found:

- Last accepted timestamp: `1784162145`
- First ready-to-finalize timestamp: `1784162146`
- Interval from deployment creation: `1806` seconds

A premature public finalization attempt was rejected in wrapper `0x9aa18f70b0cd77af2db11c392423797b41e888e2200ac368a614435411699a37`, confirming that accepted did not mean ready or finalized.

SDK caveat: `genlayer-js` 1.1.8 silently ignored the unsupported `stateStatus` option used by older repository scripts. The supported `transactionHashVariant` values are `latest-nonfinal` and `latest-final`; during this run both returned the same accepted-state storage. Therefore this report establishes finality from each transaction's status and execution result, never from a read variant alone. All five final transaction statuses were directly observed.

## 14. Exact commands used

Core repository and live commands were:

```bash
git switch main
git pull --ff-only origin main
git status -sb
git rev-parse HEAD
git diff -- contracts/truth_market.py
git switch -c spike/v4-gate1-two-step-execution

genlayer network info
genlayer account show
genlayer deploy --contract experiments/v4-gate1/contracts/truth_market_v4_gate1_probe.py
genlayer schema 0xeE59406E93c60BcA0375EdD4084209aA28e6Ab95
genlayer code 0xeE59406E93c60BcA0375EdD4084209aA28e6Ab95

genlayer write 0xeE59406E93c60BcA0375EdD4084209aA28e6Ab95 request_probe --args gate-one-alpha
genlayer account use truthmarket-gate1-executor
genlayer write 0xeE59406E93c60BcA0375EdD4084209aA28e6Ab95 execute_probe --args 1
genlayer write 0xeE59406E93c60BcA0375EdD4084209aA28e6Ab95 execute_probe --args 1
genlayer write 0xeE59406E93c60BcA0375EdD4084209aA28e6Ab95 execute_probe --args 999999

genlayer trace 0x9045f352ed6520e37ef23587c5ed69c63896b9cf91a19469d5de589e1c674e82
genlayer trace 0x1da36ecfb9dcea961e6279e9c0be10deca67ee44e95ca3d53e7211385a134edf
genlayer trace 0xdc4e83844aa65f8c8263330bf71377d4385239cc0df2f214d01cdfd145086127
```

Status and state were queried with `createClient({ chain: testnetBradbury }).getTransaction({ hash })`, `readContract` using both documented transaction-hash variants, and the documented read-only `gen_getTransactionStatus` RPC. Public finalization uses `genlayer finalize <hash>` only after status is `READY_TO_FINALIZE`.

Validation commands:

```bash
python3 -m unittest discover -s experiments/v4-gate1/tests -v
PYTHONPYCACHEPREFIX=/tmp/truthmarket-v4-gate1-pycache python3 -m py_compile experiments/v4-gate1/contracts/truth_market_v4_gate1_probe.py
node --check experiments/v4-gate1/scripts/run-gate1.mjs
npm run lint
npx tsc --noEmit
npm test
npm run build
npm audit --omit=dev
PYTHONPYCACHEPREFIX=/tmp/truthmarket-v4-gate1-pycache python3 -m py_compile contracts/truth_market.py
git diff --check
git diff -- contracts/truth_market.py
git diff --name-only
git status --short
```

## 15. Transaction hashes

- Valid deployment: `0xc005a1e04714302261880fcc2d4a70692d45794d54918691b918e7123ed816e7`
- Request: `0x2c1597b55bf683bbdea008c7beb20752d1b71004ffa5b539b306a42bee646aa0`
- Execution: `0x9045f352ed6520e37ef23587c5ed69c63896b9cf91a19469d5de589e1c674e82`
- Duplicate execution: `0x1da36ecfb9dcea961e6279e9c0be10deca67ee44e95ca3d53e7211385a134edf`
- Invalid request: `0xdc4e83844aa65f8c8263330bf71377d4385239cc0df2f214d01cdfd145086127`

Invalid metadata deployment transactions retained for reproducibility: `0xe3b9a4ef9b57a3174e946aa809bbeb984dc8f11cd31bf775b32abc97af958765`, `0xf9897030d3505dc8ce43ec960f9c7d944737f36538d20b37da8626e4ff11b413`, and `0xe2814d9902bd439ab82bdb3f16089c0165cf61ca980dc6f14fa50aa2faa8b650`. All ended `FINISHED_WITH_ERROR` before usable contract code existed.

## 16. State snapshots

Before execution:

```json
{"completed_at":"","executor":"","payload":"gate-one-alpha","request_id":"1","requested_at":"2026-07-16T00:11:41Z","requester":"0x1f87Ae197af539253978d435aD45cCf28Fb95024","result":"","status":"REQUESTED"}
```

After execution and after both rejected calls:

```json
{"completed_at":"2026-07-16T00:13:10Z","executor":"0x22c3D77ee135905C0ED00cC8249Ef5958399b3e1","payload":"gate-one-alpha","request_id":"1","requested_at":"2026-07-16T00:11:41Z","requester":"0x1f87Ae197af539253978d435aD45cCf28Fb95024","result":"OTHER","status":"COMPLETED"}
```

Machine-readable evidence is in `fixtures/gate1-evidence.json`.

## 17. Failures or limitations

- One final state read received a transient HTML response from the Bradbury RPC; a single read-only retry succeeded and no transaction was resubmitted.
- The classifier returned allowed but semantically unexpected `OTHER` for `gate-one-alpha`.
- The successful trace reported two precompile hits and zero direct LLM-module calls while its receipt contained the non-comparative eq-block output. Cached/precompiled execution attribution is not fully observable from this trace.
- Bradbury requires enough unreserved balance for overlapping accepted transactions. Two first attempts were rejected at the EVM wrapper until the experimental signer was topped up.
- Three unusable deployments exposed strict GenVM header parsing: the version and dependency lines must be first, consecutive, and followed by a blank line.
- Storage read variants did not visibly separate accepted and finalized state. Transaction status remains the authoritative finality signal for this experiment.

## 18. Dependencies discovered on Gates 2–10

- Gate 4 dependency: failed duplicate/invalid writes rolled back with zero storage proof, but malformed AI output, retry, and recovery were not tested.
- Gate 6/10 dependency: platform datetime was stored as an opaque string only; deterministic `uint64` conversion and arithmetic were not tested.
- Gate 7 dependency: accepted/finalized overlap, read-variant behavior, appeal-window monitoring, and public finalization will need explicit application handling. Adversarial concurrency was not tested.
- Gate 8 dependency: only one bounded short payload was stored; full canonical invocation capacity and chunking were not tested.

No other gate is claimed complete.

## 19. Security limitations

The experimental classifier is not a resolution oracle. The probe has no expiry, cancellation, retry policy, fund custody, access-control role, migration path, or production integration. It must never be used for value or deployed over the V3 address. Public test accounts were used; no key or token was written to source, fixtures, logs, or this report.

After evidence collection, the temporary executor credential was removed from the OS keychain and the pre-existing `worker` account was restored as the active CLI account.

## 20. Reproduction instructions

Follow `README.md` with two distinct funded Bradbury signers. The runner validates chain ID `4221`, deploys a new address, refuses identical callers, records submitted/accepted/finalized timelines, invokes public finalization only at `READY_TO_FINALIZE`, verifies unchanged rejection state, and writes public JSON evidence. Independently inspect every hash and compare the deployed code SHA-256 to the local source. Never place private keys in repository files or command arguments.

## 21. V3 and production-file confirmation

Only `experiments/v4-gate1/` is new or modified. `contracts/truth_market.py`, existing frontend files, ABI/schema, address/configuration, packages/lockfiles, tests, V3 deployment scripts, Vercel configuration, and all production paths are untouched. No production deployment occurred. No V4 production-contract implementation or Gate 2–10 feasibility work began.

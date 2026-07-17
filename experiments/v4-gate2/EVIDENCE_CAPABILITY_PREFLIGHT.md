# Gate 2 Stage A evidence-capability preflight

Status: `EVIDENCE_CAPABILITY_NOT_PROVED`

This document records the deliberately incomplete evidence status of the local
Stage A probe. Local source and state-machine tests do not prove Bradbury
concurrency, intelligent-path entry, authoritative ordering, re-execution,
conflict behavior, or stale-write protection on Bradbury.

## Policy note — 2026-07-17

The formal evidence status remains `EVIDENCE_CAPABILITY_NOT_PROVED`, and the
controlled forensic experiment has not been executed. Under the two-track
[TruthMarket V4 release policy](V4_RELEASE_POLICY.md), this result blocks only
forensic-proof claims and the optional experiment, whose status is
`BLOCKED_PENDING_SEPARATE_AUTHORIZATION`. It no longer blocks ordinary V4
product planning, implementation, or Builder Program preparation through the
mandatory **Product Release Readiness** checklist.

This reclassification does not alter or conceal any investigation finding
below. Bradbury deployment, wallet use, funding, transaction signing or
submission, production release, and Builder Program submission still require
separate authorization. **Forensic Assurance Research** remains optional and
unproved.

## Local implementation boundary

The Stage A source implements the frozen bounded probe state machine and intended
structured read ABI for local review. It uses a bounded intelligent operation and
adds no artificial sleep, busy loop, application-selected delay endpoint, event,
or state marker for path-entry proof.

The local probe retains at most three attempts. This is sufficient for the frozen
three-attempt ordering scenario; a fourth allocation rejects before storage
mutation. The cap is a probe-only bound and creates no production limit.

The source deliberately retains the preflight-observed `# v0.2.16` header and
`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
dependency pin. This is an explicit Stage A compatibility choice pending schema
validation, not a claim that either value is universally required by GenLayer.

The following remain unproved:

- Studio schema generation for the exact `Gate2AttemptView` and
  `Gate2StateView` definitions;
- end-to-end encoding and decoding of `Optional[int]` when its value is `None`;
- preservation and independent decoding of the complete typed RPC response and
  envelope for these exact reads;
- an authoritative, historically reproducible Bradbury source for old
  intelligent-path entry and ordering;
- a permitted, practical, independently reproducible overlap mechanism in which
  the old execution remains nonterminal through successor authority.

If the exact ABI fails a separately authorized Studio schema check, Stage A must
stop for requirements review. It must not silently change to strings, scalar
getters, or a different record shape.

## Evidence-capability gate

`EVIDENCE_CAPABILITY_PROVED` requires both of the following, conjunctively:

1. Independently reproducible authoritative evidence proving old intelligent-path
   entry, old nonterminality through successor authority, successor authority
   before the old authoritative result, and finalized absence of protected stale
   mutation.
2. A permitted, practical, independently reproducible overlap mechanism using the
   approved intelligent operation without artificial delay, added path markers or
   events, favorable retries, replacement trials, or discarded trials.

Neither requirement is currently satisfied. Stage B of the optional forensic
experiment remains blocked. The original preflight treated this as a global
Production V4 blocker; the dated policy note above supersedes only that release
dependency, not the evidence conclusion. Raw runner evidence cannot authorize
`PASS` or `FAIL`; only a future independently reviewed verifier may produce
verified trial and scenario results.

## Unfilled inspection record

The following table is a template, not evidence. Empty cells mean capability has
not been proved.

| Required fact | Authoritative provider/interface | Exact request | Exact response fields | Historical/finalized semantics | Reproduction procedure | Raw response hash |
| --- | --- | --- | --- | --- | --- | --- |
| Old intelligent path entered |  |  |  |  |  |  |
| Old remained nonterminal through successor authority |  |  |  |  |  |  |
| Successor authority preceded old authoritative result |  |  |  |  |  |  |
| Finalized state contains no protected stale mutation |  |  |  |  |  |  |

If automated read-only inspection is unavailable, a documented manual read-only
procedure may be reviewed. Lack of access is never capability proof.

## Safety statement

No deployment was performed for this Stage A implementation. No GenLayer Studio,
wallet, signer, account, funding, transaction submission, contract upgrade, or
chain write was used. No runner or verifier executable is included.

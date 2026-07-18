# TruthMarket V4 BF-0 test-command manifest

Status: `DRAFT_COMMAND_SPECIFICATION_ONLY`

## Baseline

- Repository: `https://github.com/Manablaq/Truthmarket`
- Baseline commit: `eea21e1617c32c447ba43da658402435126d5272`
- Baseline tree: `c0991d4d0df247dfd41bf08977f5eff900a37873`
- Local Node.js declaration captured during drafting: `v24.15.0`
- Local npm declaration captured during drafting: `11.12.1`
- Local Python declaration captured during drafting: `Python 3.9.6`
- CI Node declaration: `22.x`
- CI runner declaration: `ubuntu-latest`

Expected counts are ownership boundaries, not transferable proof for
an absent production V4 source. This file specifies commands and
acceptance expectations only; it is not an execution record.

## Command register

| ID | Owner | Exact command template | Expected result | What it does not prove |
| --- | --- | --- | --- | --- |
| `TC-01` | Python syntax | `PYTHONPYCACHEPREFIX=/tmp/truthmarket-bf0-pycache python3 -m py_compile contracts/truth_market.py experiments/v4-gate1/contracts/truth_market_v4_gate1_probe.py experiments/v4-gate2/contracts/truth_market_v4_gate2_probe.py` | Exit `0` | V3 and isolated probe syntax only; no schema or runtime proof |
| `TC-02` | Gate 1 Python | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s experiments/v4-gate1/tests -p 'test_*.py' -v` | 14 tests, exit `0` | Gate 1 local source/model requirements; not a new live run |
| `TC-03` | Gate 2 Python | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s experiments/v4-gate2/tests -p 'test_*.py' -v` | 69 tests, exit `0` | Canonicalization, Stage A probe/model, scheduler, ABI shape, and AST ordering only |
| `TC-04` | Gate 2 Node | `node --test experiments/v4-gate2/tests/gate2-canonicalization.test.mjs experiments/v4-gate2/tests/gate2-verdict-rules.test.mjs` | 24 tests, exit `0` | Frozen canonicalization and verdict-rule specifications; not an evidence verifier |
| `TC-05` | Repository Node | `npm test` | 77 tests, exit `0` | Current V3 frontend/tooling and frozen regressions; not production V4 |
| `TC-06` | ESLint | `npm run lint` | Exit `0` | Static JavaScript/TypeScript lint boundary |
| `TC-07` | TypeScript | `npx tsc --noEmit --incremental false` | Exit `0` | Current frontend type boundary |
| `TC-08` | Production build | `npm run build` | Exit `0` | Current Next.js application build; not V4 deployment |
| `TC-09` | Candidate commit whitespace | `git diff-tree --check "$CANDIDATE_SHA^" "$CANDIDATE_SHA"` | Exit `0` | Candidate diff formatting only; does not execute tests |
| `TC-10` | Exact-candidate pull-request CI | PR body contains exactly one `BF0-Candidate-Commit: <40-hex>` and `BF0-Candidate-Tree: <40-hex>` marker; workflow checks out the PR head SHA, fails unless the markers, event head SHA, `git rev-parse HEAD`, and `git rev-parse HEAD^{tree}` agree, then runs `npm ci && npm run lint && npx tsc --noEmit && npm test && npm run build && git diff --check && PYTHONPYCACHEPREFIX=/tmp/truthmarket-pycache python3 -m py_compile contracts/truth_market.py` and uploads `ci-candidate-identity.txt` | Successful pull-request job with `tc10_eligible=YES`, exact candidate commit/tree equality, and retained identity artifact | CI uses Node `22.x`; workflow Python version and runner image digest are not pinned; push runs record identity but are not TC-10 candidate evidence |

## Exact direct command-input closures

The complete direct immutable inputs consumed by the three bounded gate suites
are defined in `PRODUCT_GATE_REGISTER.md` as `T-TC02-INPUTS`,
`T-TC03-INPUTS`, and `T-TC04-INPUTS`. Those closures include every directly
read probe, model, scheduler, support module, test, fixture, schema, reason-code
specification, scenario specification, and canonicalization-vector file.
Any gate or PRR row naming TC-02, TC-03, or TC-04 without the corresponding
closure locator is invalid and must fail structural validation.

## Required external local-validation record

No local command is represented as acceptance evidence by this package.
An external record must bind to the immutable candidate object: the Git
commit containing this package, as identified by the external candidate-
identity record.

The record must contain:

1. exact repository URL, candidate commit SHA, candidate tree SHA, and parent SHA;
2. exact command ID and fully expanded command;
3. start and end timestamps;
4. working-directory clean-state proof before and after execution;
5. exact resolved Git, Node.js, npm, Python, ESLint, TypeScript, and
   Next.js versions applicable to the command;
6. exit code for every command;
7. expected and observed test counts where applicable;
8. complete stdout/stderr artifact identity and SHA-256;
9. final file/tree integrity proof; and
10. an explicit statement that the record does not change any PRR or
    authorization status.

A precommit run against a mutable index or staged diff may be useful
author feedback, but it is not the candidate-commit validation record.

## Required external CI record

The CI record must bind the exact same candidate commit and tree and include the
workflow run URL and ID, job URL and ID, conclusion, event name, PR head SHA,
external PR-body candidate markers, asserted and resolved commit/tree,
`tc10_eligible=YES`, resolved Node/npm/Python versions, available runner-image
identity, timestamps, complete logs, and the SHA-256 of the downloaded
`ci-candidate-identity.txt` artifact. The record must prove that checkout and
all commands executed against that exact object rather than a generated merge
ref. A push result with `tc10_eligible=NO` is not candidate evidence.

TC-10 remains `NOT_RUN_FOR_CANDIDATE` until that exact pull-request record exists.

## Ownership boundaries

### Gate 1

The 14-test suite belongs to the isolated two-transaction feasibility
probe. Its historical live evidence is retained separately. Re-running
the local suite does not perform deployment, signing, funding, or a
Bradbury transaction.

### Gate 2 Python

The 69-test suite owns Python canonicalization, deterministic
Stage A probe/model behavior, scheduler harness behavior, ABI/source
shape, and source-order assertions. It does not own the Node verdict
rules and does not prove production market accounting.

### Gate 2 Node

The 24-test suite owns the independent Node canonicalizer and
verdict-rule specification. The verdict helpers compose only
internally verified test objects; they are not a controlled-experiment
evidence verifier.

### Repository Node

The 77-test suite owns current V3 frontend, transaction activity,
deployment-verification helpers, compatibility regressions, and frozen
V4 fixture checks. It does not satisfy PRR-04 through PRR-08 for a
future production source.

## Version rule

Every retained execution record must state the exact commit, command,
tool versions, timestamps, exit code, and output identity. A moving
declaration such as `22.x` or `ubuntu-latest` is not an exact binary or
image identity. A future acceptance record must retain the resolved
versions from that run.

# TruthMarket V4 BF-0 source and fixture hash manifest

Status: `CANDIDATE_PACKAGE_NO_IN_PACKAGE_APPROVAL`

## Manifest identity

- Repository: `https://github.com/Manablaq/Truthmarket`
- BF-0 baseline commit: `eea21e1617c32c447ba43da658402435126d5272`
- BF-0 baseline tree: `c0991d4d0df247dfd41bf08977f5eff900a37873`
- Capture timestamp: `2026-07-17T23:18:43+01:00`
- Digest algorithm: SHA-256 over exact Git-object or repository bytes
- Tracked V4 evidence inputs: `38`
- Total normalized inputs: `46`
- Production V4 source: `ABSENT`
- Production V4 schema: `ABSENT`

This manifest binds the baseline evidence inputs used by BF-0. It does
not assert that a future production V4 implementation exists, passes
any Product Release Readiness requirement, or is authorized.

The seven required BF-0 deliverables and the index are intentionally
excluded from their own input-hash table. Their exact bytes are bound by
the immutable candidate object: the Git commit containing the package and
its root tree. Because that object cannot embed its own identity without
changing itself, an external candidate-identity record must capture the
exact repository, commit, tree, parent, and eight output-file identities.
External validation, CI, and independent-review artifacts must all bind to
that same candidate object and remain outside it. This manifest never
represents those external artifacts or BF-0 acceptance as in-package facts.

## External provenance locators

The following GitHub body identities are provenance locators for
historical statements. They do not substitute for missing raw runtime
outputs or independent review artifacts.

| Object | Immutable locator and captured metadata | Exact captured body identity | Evidence boundary |
| --- | --- | --- | --- |
| PR #11 Stage A storage/schema statement | `https://github.com/Manablaq/Truthmarket/pull/11`; author `Manablaq`; created `2026-07-17T10:41:36Z`; merged `2026-07-17T10:59:15Z`; source commit `805b4c9ca5b3a2146a9861b6bfa8faddfefd7db7`; merge commit `9935e1a84ba29cf9a2153def8296cc16807049b8` | UTF-8 bytes `1296`; SHA-256 `b9855900438e8b1b213b20ec12f40de426d7f5597994759a6b0ef1109f0e2ea6` | Author-authored PR-body provenance only; no raw schema responses or GitHub review objects retained |
| PR #12 product/forensic separation policy | `https://github.com/Manablaq/Truthmarket/pull/12`; author `Manablaq`; created `2026-07-17T12:38:00Z`; merged `2026-07-17T13:07:13Z`; source commit `541b37644f043edbf8126d99d07bf581eaf8fc40`; merge commit `cd242dc2499b676e111167b8b5c92e5b5334eedf` | UTF-8 bytes `2486`; SHA-256 `e693a9cca9360691d56da7d8a7ca424e5079619268a760141c84ddb4463f1da7` | Exact merged-policy provenance; no retained independent GitHub review object is claimed |

The body hashes are reproducible with:

```bash
for pr in 11 12; do
  gh pr view "$pr"     --repo Manablaq/Truthmarket     --json body |
  python3 -c '
import hashlib
import json
import sys

body = json.load(sys.stdin)["body"].encode("utf-8")
print(len(body), hashlib.sha256(body).hexdigest())
'
done
```

## Toolchain capture

| Tool or environment | Captured declaration | Boundary |
| --- | --- | --- |
| Git | `git version 2.50.1 (Apple Git-155)` | Exact local BF-0 capture environment |
| Node.js | `v24.15.0` | Exact local BF-0 capture environment |
| npm | `11.12.1` | Exact local BF-0 capture environment |
| Python | `Python 3.9.6` | Exact local BF-0 capture environment |
| ESLint | `v9.39.4` | Exact local BF-0 capture environment |
| TypeScript | `Version 5.9.3` | Exact local BF-0 capture environment |
| Next.js | `Next.js v16.2.10` | Exact local BF-0 capture environment |
| CI Node declaration | `22.x` | Workflow declaration, not an exact historical binary version |
| CI runner | `ubuntu-latest` | Moving provider image; exact image digest is not pinned |

## Installed direct JavaScript package versions

The local package tree used for this BF-0 capture resolved the following
exact direct-package versions. CI dependency installation remains
governed by the exact `package-lock.json` bytes recorded below.

| Package | Declared range | Installed version | Section |
| --- | --- | --- | --- |
| `@tanstack/react-query` | `^5.101.2` | `5.101.2` | `dependencies` |
| `genlayer-js` | `^1.1.8` | `1.1.8` | `dependencies` |
| `next` | `16.2.10` | `16.2.10` | `dependencies` |
| `postcss` | `^8.5.16` | `8.5.16` | `dependencies` |
| `react` | `19.2.4` | `19.2.4` | `dependencies` |
| `react-dom` | `19.2.4` | `19.2.4` | `dependencies` |
| `viem` | `^2.55.0` | `2.55.0` | `dependencies` |
| `@tailwindcss/postcss` | `^4` | `4.3.2` | `devDependencies` |
| `@types/node` | `^20` | `20.19.43` | `devDependencies` |
| `@types/react` | `^19` | `19.2.17` | `devDependencies` |
| `@types/react-dom` | `^19` | `19.2.3` | `devDependencies` |
| `eslint` | `^9` | `9.39.4` | `devDependencies` |
| `eslint-config-next` | `16.2.10` | `16.2.10` | `devDependencies` |
| `tailwindcss` | `^4` | `4.3.2` | `devDependencies` |
| `typescript` | `^5` | `5.9.3` | `devDependencies` |

- `package-lock.json` format version: `3`
- Direct installed packages recorded: `15`

Local and CI environments are intentionally distinct. These rows are
captured declarations, not independent execution attestations. A local
result under Node.js `v24.15.0` would not by itself prove the same result
under the CI workflow's Node.js `22.x` declaration. Exact validation
versions and outputs must be retained externally and bound to the same
immutable candidate object identified by the external identity record.

## Exact source and fixture identities

| Path | Bytes | SHA-256 | Evidence boundary |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | 539 | `e97b79ff3fb562a43656e0b781472e50b300982d1d1f59977c07d454bec9c0ac` | Current CI command declaration |
| `contracts/truth_market.py` | 23686 | `b07a8983a4c879f64a33de33408f47d5062e7973903df23224a365c3afb4bee0` | Current V3 contract; not V4 evidence |
| `docs/GENLAYER_COMPATIBILITY_BASELINE.md` | 5331 | `81fabb8d07a59f8500c6612a6ab9ec2da31091568bf566e5134f53676379b3b8` | Pinned compatibility requirements |
| `docs/V4_ARCHITECTURE.md` | 132575 | `92411000a0d83c2717ae7f8d57357d4644bd317c243f15521836fa4b8d544b22` | V4 specification, planning, or audit record |
| `docs/V4_BOUNDED_FOUNDATION_PLAN.md` | 35879 | `3c0fba8d7f1e4a2f0cfc785b910add4d8c1fb973cdd421fdd516346d46690e74` | V4 specification, planning, or audit record |
| `docs/V4_ECONOMICS_AND_SAFETY.md` | 26008 | `bd7202c708d3e0f1e6f4bf97ad60701c27370e9c329bd4cfc49ee58b87360ca2` | V4 specification, planning, or audit record |
| `docs/V4_IMPLEMENTATION_READINESS_AUDIT.md` | 20435 | `487ddb9b61f1561a953d37a3cf6ade29f904b80745966963bd18c32de392db60` | V4 specification, planning, or audit record |
| `docs/V4_MIGRATION_PLAN.md` | 20060 | `0a487c4332da3de1c9c070bd6a1b11c862c5d31d6227cec57d3d06ae2dd0973b` | V4 specification, planning, or audit record |
| `docs/V4_STATE_MACHINE.md` | 33019 | `22f9842968f121a872cae2b2b21e8d028c8f9712e2e3fd812444e74637c64166` | V4 specification, planning, or audit record |
| `docs/V4_TEST_PLAN.md` | 58158 | `078d118fa6326da306c263b61ce2bbdae849f2cecff668937f75b71e39e98e3f` | V4 specification, planning, or audit record |
| `experiments/v4-gate1/GATE1_REQUIREMENTS.md` | 9302 | `f545afccdd49839b5508c3b4f80abd5748249c5bc7650b2510c628cf24c59300` | Gate 1 requirements, tests, fixtures, or evidence |
| `experiments/v4-gate1/GATE1_RESULTS.md` | 14890 | `60495421da2f27f04d26667f53cb340ceb7d60c60907e55e1a862a9eac25ef2c` | Gate 1 requirements, tests, fixtures, or evidence |
| `experiments/v4-gate1/README.md` | 5592 | `a9624c7feb1da5991bcff160ba085d739a0bebd205db919b6d2f27d470b242e3` | Gate 1 requirements, tests, fixtures, or evidence |
| `experiments/v4-gate1/contracts/truth_market_v4_gate1_probe.py` | 3712 | `258c9023adfca7fdee94028baa228fb112bc854ca1db05a2869b70f204eb9e1a` | Gate 1 isolated nonproduction probe |
| `experiments/v4-gate1/fixtures/gate1-evidence.example.json` | 500 | `ef5cab3dcc16a0515674477fb4129acd7bec967d34edfa224305f748aa2c089e` | Gate 1 requirements, tests, fixtures, or evidence |
| `experiments/v4-gate1/fixtures/gate1-evidence.json` | 7478 | `a662e2317260b8d9352249f65d54e5e674f6d8c08dfe9208d6e8cb40a4282098` | Gate 1 requirements, tests, fixtures, or evidence |
| `experiments/v4-gate1/scripts/run-gate1.mjs` | 11777 | `856afe7c890ef25aa8060f7807b46b16c8155032a355739a21504dae0f1cd2ec` | Gate 1 requirements, tests, fixtures, or evidence |
| `experiments/v4-gate1/tests/test_gate1_probe.py` | 8743 | `0b43c8648aa44aff6ef4445cfaef79cfe51507ac9cf5103b0694288b94793639` | Gate 1 requirements, tests, fixtures, or evidence |
| `experiments/v4-gate2/BRADBURY_ABI_PREFLIGHT.md` | 6440 | `e197443429dda4c05869193038f208f778a2cf7adcf8a8c171cf49fbe9c86b79` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/EVIDENCE_CAPABILITY_PREFLIGHT.md` | 4894 | `4e50f89fd36f32161037baf15dea0b6536ce32f1eb8189d83894c9f1801258e4` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/GATE2_REQUIREMENTS.md` | 27015 | `21d07aba51b19a0e9eb7a484a9ea9c7e6192c10b80722b2a7503569ab1ed0253` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/README.md` | 7720 | `db2381397da24fd750e52262aeba611efbd28503830166df1faec6266bf31071` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/V4_RELEASE_POLICY.md` | 10450 | `169ef8fc7544ec1f11c86079323a7ea066e338240a22b993e8e364af54fa8f9f` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/VERIFIER_SPEC.md` | 8828 | `2dfe08d46be09095300aa9abd51036bacb2f86ad224078c7d78d0d68b94f3b3c` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/contracts/truth_market_v4_gate2_probe.py` | 10600 | `97827e38b0dc606920acccdeff5b44379a5edccf733c4d521daab6cbc8d3791a` | Gate 2 Stage A isolated nonproduction probe |
| `experiments/v4-gate2/fixtures/canonicalization-vectors.json` | 14835 | `014e6bc11d0798f11e25849f5834c4b7e46bc36b38a4b87e6eb2641fc550a922` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/models/gate2_model.py` | 8076 | `50d5c5241142c41b41d51c308e1bc0ceee6b7040dc9376e40198f29831dd9a77` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/models/gate2_scheduler.py` | 3000 | `3703900e0b0528cdd6524e114bdaaee7632864dd91754f5c50331e2555f589a8` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/specs/gate2-evidence.schema.json` | 29249 | `ade8b9a3848bf8996c2f86bf58f1dbdc6efb6465bd2ba89874139f0dedc569bd` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/specs/gate2-reason-codes.json` | 2336 | `e4aeff4b94f7b3ce89bb6ab1c9afad0b428fee740c67b04f6c3ba38bdf1be13e` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/specs/gate2-scenarios.json` | 23011 | `066d034e224d4caab87abd7a7d07faa68a5784793f44ef6277658c74bf2b8aef` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/gate2-canonicalization.test.mjs` | 5776 | `4467bfa5ce46ef0dd320a933af47b35780cc46572cc5a95e30354bd69dc272c6` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/gate2-verdict-rules.test.mjs` | 19664 | `0e4b02a1c7385eead9ef270ffaefbfe74025ff99a23d2e5babd8759416f14d4d` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/support/canonical-json.mjs` | 5863 | `4c4530dfa53810ed95b87e54b66ce41e4942e6a6f73b2724ca539040e8021636` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/support/canonical_json.py` | 4401 | `3902eee0293abc9b7e3edd3102425e46ab4cc25382a914035381c7ebd348a2d2` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/support/verdict-rules.mjs` | 18956 | `ee2a3aa2cb8ab0cf52e60f8c146797902de109bc775f07b258a78dfe630b021d` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/test_gate2_canonicalization.py` | 5651 | `211ac0a7e77bebbf7b77990a09b0c413573b1a5da1746f011084e281dcfa6d62` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/test_gate2_model.py` | 10835 | `8a7b0fa4269027d8e26194c6a49321935a03057c8482ed020e68a39cb9b1687e` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/test_gate2_probe.py` | 19276 | `149113782790f7f4c20801ff041a18ee14ab608e9ce1c4a5b4a3f5dbd60d125c` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/test_gate2_probe_abi.py` | 16964 | `da20518c9de95382568b80d8ddc6cc85c790726d33b9e93118d08f1120c805cf` | Gate 2 model, specification, test, or evidence record |
| `experiments/v4-gate2/tests/test_gate2_scheduler.py` | 2080 | `bd5e53d7409b7501d27e6a8ae5e4750d759ca9608d9e3af03bff895a698b23e5` | Gate 2 model, specification, test, or evidence record |
| `lib/config.ts` | 933 | `43a83ad54a73e2288d5bae20771b59c5d32547a2ce35dc88192b2254d13c103c` | Current V3 frontend/configuration boundary |
| `lib/genlayer.ts` | 3269 | `fc207d344ca3f6cc7f2150ef0c6e1f615c8b43ddb409d28945b513fe7ad3b589` | Current V3 frontend/configuration boundary |
| `lib/schemas.ts` | 7662 | `6d2d6ce6b66612fb419f773b3445ef83d5c2b563346aa13685da854266001ea1` | Current V3 frontend/configuration boundary |
| `package-lock.json` | 238043 | `f1c3989d1c5afea4ed0b762990577dbd51a52afae5ac8387dba918648a7bbde6` | Current JavaScript dependency/tooling boundary |
| `package.json` | 1017 | `07bc7f9ca9d633cae071574229f16259abe80197c06fc3052f99de29b242a08b` | Current JavaScript dependency/tooling boundary |

## Exact baseline-manifest reproduction procedure

Run from a clone containing the baseline commit and this manifest:

```bash
BASE=eea21e1617c32c447ba43da658402435126d5272
EXPECTED_TREE=c0991d4d0df247dfd41bf08977f5eff900a37873

test "$(git rev-parse "${BASE}^{tree}")" = "$EXPECTED_TREE"

python3 - <<'PY'
from __future__ import annotations

import hashlib
import re
import subprocess
from pathlib import Path

base = "eea21e1617c32c447ba43da658402435126d5272"
manifest = Path(
    "docs/v4-evidence/SOURCE_AND_FIXTURE_HASH_MANIFEST.md"
).read_text(encoding="utf-8")

rows = re.findall(
    r"^\| `([^`]+)` \| ([0-9]+) \| `([0-9a-f]{64})` \| .+ \|$",
    manifest,
    re.MULTILINE,
)

if len(rows) != 46:
    raise SystemExit(f"expected 46 rows, found {len(rows)}")

seen: set[str] = set()

for path, expected_size, expected_digest in rows:
    if path in seen:
        raise SystemExit(f"duplicate path: {path}")
    seen.add(path)

    data = subprocess.check_output(
        ["git", "show", f"{base}:{path}"]
    )
    actual_size = len(data)
    actual_digest = hashlib.sha256(data).hexdigest()

    if actual_size != int(expected_size):
        raise SystemExit(
            f"size mismatch: {path}: "
            f"{actual_size} != {expected_size}"
        )

    if actual_digest != expected_digest:
        raise SystemExit(
            f"digest mismatch: {path}: "
            f"{actual_digest} != {expected_digest}"
        )

print("PASS: 46 baseline manifest rows match exact Git-object bytes")
PY
```

This procedure independently checks the baseline commit/tree and every
listed source/fixture row. It does not validate the eight BF-0 output
documents; the immutable candidate object and its root tree bind those bytes.

## Candidate-output and validation binding

An external candidate-identity and validation record must retain:

- exact candidate commit, tree, parent, and repository;
- `git ls-tree -r --full-tree <candidate> -- docs/v4-evidence` output;
- SHA-256 identities of every BF-0 output document as read from that candidate;
- commands, timestamps, exit codes, resolved tool versions, and complete
  stdout/stderr artifact digests; and
- clean-tree proof before and after validation.

The independent-review package must additionally include a read-only Git
bundle or equivalent complete canonical object set containing the baseline
through the candidate, sufficient for offline `git fsck`, `git cat-file`,
`git rev-parse`, `git ls-tree`, `git diff-tree`, parent/root-tree verification,
and exact extraction of the eight reviewed documents.

No local, CI, review, or acceptance result is claimed by this manifest; those
claims require separate external records bound to the same candidate object.

## Interpretation rules

1. V3 source and frontend hashes prove only the current V3 baseline.
2. Gate 1 hashes bind the isolated Gate 1 probe and its evidence.
3. Gate 2 contract hashes bind the isolated Stage A probe, not a
   production V4 contract.
4. Gate 2 model, fixture, support, and test hashes do not establish
   Bradbury protocol-forensic proof.
5. V4 specifications are requirements and plans, not implementation
   evidence.
6. A changed byte invalidates the corresponding row and requires a new
   manifest revision.

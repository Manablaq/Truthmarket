# Testing

Run `npm ci`, lint, TypeScript, tests, build, production dependency audit, Python syntax compilation, `git diff --check`, and confirm the contract diff is empty. Tests use Node's built-in runner and require no external search or HTTP utilities. Focused coverage includes SDK-shaped receipt classification, immutable Activity journal derivation, exact key/record binding, bounded reload recovery without submission, monitor ownership, malformed storage, valid-hash storage failure, EIP-6963 discovery gating, staged error redaction, and the single-attempt API timeout with timer cleanup.

# V3 limitations

- Webpages are not fetched. Validators receive URL strings, user notes, and timestamps only.
- Source identity, accessibility, content, quality, and publication dates are not authenticated.
- URLs and notes are unverified user claims.
- Challenge evidence is stored but is not supplied to re-resolution.
- Accepted-state reads are not finality proof.
- There is no refund/cancellation route or challenge waiting period.
- No-evidence, `UNRESOLVED`, and zero-winning-pool cases can lock funds.
- Bradbury is a testnet. V3's complete lifecycle is not end-to-end verified.

Verified in Phase A: frontend schemas, API validation, deterministic provider handling, pre-write checks, transaction hash gating, Activity semantics, static searches, lint/types/tests/build. Unverified: production behavior after these uncommitted changes and a complete create-through-claim V3 lifecycle.

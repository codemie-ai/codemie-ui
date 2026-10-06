# Code review — 2026-09-09-epmcdme-8512 (2026-09-09)

**request-changes** · confidence: low · 5 blocking · 0 deferred · 0 filtered as noise
Coverage: edge-case ✓ · blind — n/a (balanced profile) · verification-gap — n/a (balanced profile) · acceptance — n/a (no spec)  (1/1 applicable lenses ran)

No spec ArtifactRef found — acceptance criteria were not audited; confidence held at low.

## Look here first

- `tailwind.config.ts:617` — [other: unintended side-effect] ACTION button hover gradient silently changed via purple-radial-hover; unguarded regression — CR-004
- `unknown` — [other: CI blocker] Two merge-from-origin commits violate the Tekton-enforced regex; branch cannot be merged — CR-005
- `src/components/Button/Button.tsx:52` — [other: test gap] variant prop magical path unverified; regression on supported interface invisible — CR-003

## Also flagged

- `src/components/Button/__tests__/Button.test.tsx` — [other: test gap] magical button disabled state (opacity-50 over gradient) untested — CR-001
- `src/components/Button/__tests__/Button.test.tsx` — [other: test gap] magical button isLoading state (shimmer+gradient) untested — CR-002

## Checked and clean

security ✓ · code-quality — n/a (no guide) · commit-format ✗ fail (2 merge-from-origin subjects violate enforced regex — rebase onto origin/main to remove them)

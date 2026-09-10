# Code review - EPMCDME-13577 CLI Analytics (2026-09-09)

**approve** - confidence: medium - 4 findings, 4 resolved

Coverage: targeted verifier ✓ - acceptance n/a (no spec for this branch)

## Finding status

| ID | File | Status |
|---|---|---|
| CR-003 | `src/pages/analytics/AnalyticsPage.tsx:53` | resolved - `isProjectAdmin` gate now covered in both directions |
| CR-004 | `src/pages/analytics/__tests__/AnalyticsPage.test.tsx:205` | resolved - flag key corrected, mock default no longer shadows the branch |
| CR-008 | `src/pages/analytics/components/cli-analytics/views/SessionTimeline.tsx:137` | resolved - composite React key |
| CR-009 | `src/pages/analytics/components/cli-analytics/views/UsersView.tsx:311` | resolved - non-drillable row no longer selects |

## What changed

- **CR-004** - the flag-disabled test branched on `features:localAnalytics`, a key that appears nowhere
  in `src/`, while production reads `features:cliAnalytics`. It passed only via the mock's catch-all.
  Corrected the key, and changed the catch-all to `[true, true]` so the branch determines the
  assertion rather than being shadowed by the default.
- **CR-003** - added the missing access-control coverage: a project admin with `isAdmin: false` asserts
  enabled, and an all-false `projects` array asserts disabled, pinning the `.some()` predicate both
  ways. Mutation-checked: removing `|| isProjectAdmin` fails exactly 1 of 10 tests.
- **CR-008** - `key={dispatch.label}` collided whenever two dispatches shared a label, and
  `DispatchRow` has no unique id. Now a composite of label and index.
- **CR-009** - `setSelected` ran unconditionally while `handleDrill` early-returned on a falsy
  `user_id`, leaving a highlighted row that opened nothing. Reachability confirmed against the
  backend, where `user_id` is `str | None` and is set to `None` when identity resolution fails.

## Verification

Run individually after `npm ci`:

| Gate | Result |
|---|---|
| affected unit suites | `Test Files 20 passed (20)`, `Tests 164 passed (164)` |
| `AnalyticsPage.test.tsx` alone | `Tests 10 passed (10)` - confirms the suite collects rather than silently skipping |
| `npm run typecheck` | clean |
| `npm run lint` | clean (only the pre-existing eslint-plugin-react version warning) |

Full unit suite and the integration project were **not** run - unverified, not passed.

## Open at merge time

Commit format is adjudicated `na`, not `pass`. Squash merge means only the squash subject and MR title
bind, and neither exists yet; branch history does not conform, but the CI regex cannot match git's own
default `Merge branch ...` subject either. Enforcement scope is not verifiable from the working tree -
`.gitlab-ci.yml` only waits on external `ci-pipeline`/`compliance-report` contexts and `.husky` has no
`commit-msg` hook. Re-adjudicate then.

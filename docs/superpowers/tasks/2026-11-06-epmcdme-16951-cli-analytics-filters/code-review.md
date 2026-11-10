---
schema: sdlc-factory/code-review@1
decision: approve
reviewed_head: 41ceff9114c3781b970436614f49154f83cdd9ef
---

# Code review — 2026-11-06-epmcdme-16951-cli-analytics-filters

**Decision:** approve (round 2, confidence low) · **Reviewed head:** `41ceff9` · **Rounds:** 2

Round 2 resolved the single blocking finding from round 1: `useCliAnalyticsUsers` now resets the page during render, keyed on the filters, so no request goes out with the new filters and the old page. Loading and error use the real store keys (`usersCharts` / `usersTable`). Confidence is low because there was no spec (acceptance lens did not run) and the standards audit had a coverage gap (no code-quality guide in the repo; the commit range was empty because the change was uncommitted at review time).

## Open — 0

## Pre-existing (not blocking) — 0

The one item deferred in round 2 (DF-001, effect-based page reset in the Sessions and Repositories hooks) was fixed after the MR reviewer raised it; see "Follow-up: reviewer comments". `code-review-final.json` is the unmodified round-2 verdict and still lists it as deferred.

## Coverage

Lenses: blind ✓ · edge-case ✓ · verification-gap ✓ · acceptance — n/a (no spec). Standards: commit-format n/a · code-quality n/a · security pass.

## Provenance

- Round 2 reviewed the working tree against base `c2844b496` (frozen diff, 1046 lines) before it was committed. `code-review-final.json` is that round's verdict, unmodified.
- The change was then committed (`e6503abc9`) and rebased onto `origin/main` `8c53414c1`, giving `41ceff9`. `git patch-id --stable` is identical for both commits, so the reviewed patch is unchanged by the rebase.
- The rebase overlap with main (`format.ts`, `SessionModal.tsx`) was checked separately: different hunks, no conflict, typography consistent. Scoped re-check after the rebase: unit tests for `cli-analytics` (25 files, 258 tests) and `tsc --noEmit` passed. The review itself was not re-run on the rebased commit.

## Follow-up: Sonar fix (single-line delta)

Sonar flagged `format.ts:202` (`Object.prototype.hasOwnProperty.call(labels, value)`, prefer `Object.hasOwn`). The `known()` helper now calls `Object.hasOwn(labels, value)`; the ternary and fallback are unchanged, so own known keys map to their label and inherited or unknown keys return the original string, for subscription, project origin and route note alike.

This delta was reviewed by the author only; no further multi-lens review was run. Checked: the existing `format`, `SessionModal` (inherited `constructor` key and unrecognized value) and `SessionsView` (other/missing) tests pass (3 files, 57 tests) and `tsc --noEmit` exits 0. The approved review above covers the rest of the change unchanged.

## Follow-up: reviewer comments (delta review, author only)

Two MR comments were addressed on top of `c5c50fcbe`. No further multi-lens run was done; the delta is small and was checked against the contract below.

1. **Readable routing label.** Backend `a9e4d4c6` (`LocalAnalyticsSessionRow`, inherited by the detail model) returns `routing_label` only for a default-project session whose note is one of the four fallback notes, otherwise null. `SessionRow` now has `routing_label?: string | null`, and the details warning uses `routeWarning(label, note)` in `format.ts`: a nonblank (trimmed) backend label wins, otherwise the mapped `route_note` (unknown or inherited keys shown as received), otherwise no warning. No labels are invented for future notes.
2. **Stale-page request.** `useCliAnalyticsSessions` and `useCliAnalyticsRepositories` now reset the page during render, keyed on every previous reset dependency (including the framework, unattributed and project overrides and the debounced search), the same pattern as `useCliAnalyticsUsers`. The 1-based UI page, 0-based API page, `fetchAll` mode and `perPage` are unchanged.

Checked: `SessionModal` (label wins, label-only, null/undefined/blank label falls back, inherited-key note, blank label without note) and the Sessions and Repositories hook tests (no request with changed filters and the old page for subscription/origin, framework override, search and fetch-all) pass with the rest of the `cli-analytics` unit project (25 files, 267 tests); the new hook assertions fail on the previous effect-based reset. `tsc --noEmit` and `eslint` on the area exit 0.
